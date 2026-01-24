import { Task } from "@/types";

/**
 * Calculates the Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment along the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculates a similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const maxLength = Math.max(s1.length, s2.length);
    const distance = levenshteinDistance(s1, s2);

    return 1.0 - (distance / maxLength);
}

/**
 * Finds a potential duplicate task from a list of existing tasks
 * Returns the friendlyId of the most similar task if it crosses the threshold
 */
export function findDuplicate(
    newTaskTitle: string,
    existingTasks: Task[],
    threshold: number = 0.8
): { friendlyId: string, similarity: number, title: string } | null {

    let bestMatch = null;
    let maxSimilarity = 0;

    for (const task of existingTasks) {
        if (!task.title) continue;

        const similarity = calculateSimilarity(newTaskTitle, task.title);

        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestMatch = task;
        }
    }

    if (maxSimilarity >= threshold && bestMatch) {
        return {
            friendlyId: bestMatch.friendlyId || bestMatch.id, // Fallback to ID if no friendlyId
            similarity: maxSimilarity,
            title: bestMatch.title
        };
    }

    return null;
}
