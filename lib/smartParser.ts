export interface ParsedResult {
    conclusions: string;
    nextWeekTasks: string;
}

export function parseNotes(text: string): ParsedResult {
    const lines = text.split('\n');
    const tasks: Set<string> = new Set();

    // Dictionaries
    const taskKeywords = ['todo', 'task', 'tarea', 'pendiente', 'action', 'acción'];

    // Imperative verbs at start of line
    const actionVerbs = [
        'enviar', 'mandar', 'revisar', 'crear', 'hacer', 'llamar', 'contactar', 'programar', 'desarrollar',
        'actualizar', 'corregir', 'subir', 'desplegar', 'verificar', 'validar', 'terminar', 'finalizar',
        'investigar', 'documentar', 'probar', 'testear', 'organizar', 'definir', 'preparar', 'completar',
        'gestionar', 'analizar', 'diseñar', 'configurar', 'implementar',
        'send', 'review', 'create', 'make', 'call', 'contact', 'schedule', 'develop', 'update', 'fix', 'deploy'
    ];

    // Indirect triggers - full phrases only to avoid partial matches like "debe" in "debemos"
    const indirectTriggers = [
        { pattern: /^debemos\s+/i, keepAfter: true },
        { pattern: /^tenemos que\s+/i, keepAfter: true },
        { pattern: /^hay que\s+/i, keepAfter: true },
        { pattern: /^se debe\s+/i, keepAfter: true },
        { pattern: /^se deben\s+/i, keepAfter: true },
        { pattern: /^necesitamos\s+/i, keepAfter: true },
        { pattern: /^hace falta\s+/i, keepAfter: true },
        { pattern: /^falta\s+/i, keepAfter: true },
        { pattern: /^pendiente[:\s]+/i, keepAfter: true },
    ];

    // Meeting keywords for tracking
    const meetingKeywords = ['reunión', 'meeting', 'comité', 'sesión', 'call', 'taller', 'workshop'];

    // Helper to clean bullet markers
    const cleanBullet = (s: string) => s.replace(/^[\*\-\•]+\s*/, '').replace(/^\d+\.\s*/, '').trim();

    // Helper to capitalize first letter
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    // Two-pass parsing: First identify structure, then extract tasks
    let pendingContext: string | null = null; // Context from a "header" line

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) {
            pendingContext = null; // Reset context on empty lines
            continue;
        }

        const isBullet = /^[\*\-\•]/.test(trimmed);
        const cleanContent = cleanBullet(trimmed);
        const lowerContent = cleanContent.toLowerCase();

        // --- TASK DETECTION ---

        // A) Explicit Task Keywords (TODO:, Tarea:, etc.)
        const keywordMatch = taskKeywords.find(k =>
            lowerContent.startsWith(k + ':') ||
            lowerContent.startsWith(k + ' ') ||
            lowerContent === k
        );
        if (keywordMatch) {
            let finalTask = cleanContent.replace(new RegExp(`^${keywordMatch}[:\\s-]*`, 'i'), '').trim();
            if (finalTask.length > 2) {
                tasks.add(`- ${capitalize(finalTask)}`);
            }
            pendingContext = null;
            continue;
        }

        // B) Checkboxes [ ]
        if (trimmed.includes('[ ]') || trimmed.includes('[]')) {
            const finalTask = trimmed.replace(/\[\s*\]/, '').replace(/^[\*\-\•\s]+/, '').trim();
            if (finalTask.length > 2) {
                tasks.add(`- ${finalTask}`);
            }
            pendingContext = null;
            continue;
        }

        // C) Check if this is a "header" line followed by bullet sub-items
        // Look ahead to see if next non-empty line is a bullet
        let hasChildBullets = false;
        for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
            const nextLine = lines[j].trim();
            if (!nextLine) continue;
            if (/^[\*\-\•]/.test(nextLine)) {
                hasChildBullets = true;
            }
            break;
        }

        // D) Indirect Triggers (Debemos, Tenemos que, Hay que, etc.)
        let matchedTrigger = null;
        for (const trigger of indirectTriggers) {
            if (trigger.pattern.test(cleanContent)) {
                matchedTrigger = trigger;
                break;
            }
        }

        if (matchedTrigger) {
            const afterTrigger = cleanContent.replace(matchedTrigger.pattern, '').trim();

            if (hasChildBullets) {
                // This is a header line - set context for child bullets
                pendingContext = afterTrigger;
            } else {
                // No children - this line IS the task
                if (afterTrigger.length > 2) {
                    tasks.add(`- ${capitalize(afterTrigger)}`);
                }
                pendingContext = null;
            }
            continue;
        }

        // E) Bullet items - may inherit context from parent
        if (isBullet) {
            if (cleanContent.length > 2) {
                // Check if first word is an action verb
                const firstWord = lowerContent.split(' ')[0];
                const isActionVerb = actionVerbs.includes(firstWord);

                if (pendingContext) {
                    // Inherit context from parent header
                    tasks.add(`- ${capitalize(cleanContent)}`);
                } else if (isActionVerb) {
                    tasks.add(`- ${capitalize(cleanContent)}`);
                } else {
                    // Generic bullet - still treat as potential task if short and actionable
                    tasks.add(`- ${capitalize(cleanContent)}`);
                }
            }
            continue;
        }

        // F) Implicit Action Verbs at Start (non-bullet lines)
        const firstWord = lowerContent.split(' ')[0];
        if (actionVerbs.includes(firstWord) && cleanContent.length > 5) {
            if (!hasChildBullets) {
                tasks.add(`- ${capitalize(cleanContent)}`);
                pendingContext = null;
                continue;
            } else {
                // Has children, use as context
                pendingContext = cleanContent;
                continue;
            }
        }

        // G) Meeting Inference
        if (meetingKeywords.some(mk => lowerContent.includes(mk))) {
            if (lowerContent.includes('hay ') || lowerContent.includes('tendremos') || lowerContent.includes('agendada')) {
                tasks.add(`- Seguimiento: ${cleanContent}`);
                pendingContext = null;
                continue;
            }
        }

        // H) Non-bullet, non-trigger line - might be context for next bullets
        if (!isBullet && hasChildBullets) {
            pendingContext = cleanContent;
        } else {
            pendingContext = null;
        }
    }

    return {
        conclusions: '', // Not used currently
        nextWeekTasks: Array.from(tasks).join('\n')
    };
}
