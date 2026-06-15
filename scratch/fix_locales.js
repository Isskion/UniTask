const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'app', 'locales');
const files = ['ca.ts', 'de.ts', 'en.ts', 'es.ts', 'fr.ts', 'pt.ts'];

const updates = {
    es: {
        'uni-vehicle-manager': 'UniVehicleCreator',
        'task-manager': 'Gestor de Tareas (ABM)',
        'allTasks': 'Todas las Tareas (Cuadro)',
        'dispoplan': 'DispoPlan (Ausencias)',
        'solution-records': 'Registros de Soluciones',
        'error_completed_immovable': 'Las tareas finalizadas no se pueden mover por el cuadro. Usa el Gestor de Tareas (ABM) para cambiar el sprint.'
    },
    en: {
        'uni-vehicle-manager': 'UniVehicleCreator',
        'task-manager': 'Task Manager (ABM)',
        'allTasks': 'All Tasks (Board)',
        'dispoplan': 'DispoPlan (Availability)',
        'solution-records': 'Solution Records',
        'error_completed_immovable': 'Completed tasks cannot be moved from the Sprint Board. Use the Task Manager (ABM) to change sprints.'
    },
    ca: {
        'uni-vehicle-manager': 'UniVehicleCreator',
        'task-manager': 'Gestor de Tasques (ABM)',
        'allTasks': 'Totes les Tasques (Quadre)',
        'dispoplan': 'DispoPlan (Absències)',
        'solution-records': 'Registres de Solucions',
        'error_completed_immovable': 'Les tasques finalitzades no es poden moure pel quadre. Utilitza el Gestor de Tasques (ABM) per canviar el sprint.'
    },
    de: {
        'uni-vehicle-manager': 'UniVehicleCreator',
        'task-manager': 'Aufgaben-Manager (ABM)',
        'allTasks': 'Alle Aufgaben (Board)',
        'dispoplan': 'DispoPlan (Abwesenheiten)',
        'solution-records': 'Lösungsaufzeichnungen',
        'error_completed_immovable': 'Abgeschlossene Aufgaben können nicht über das Board verschoben werden. Nutzen Sie den Aufgaben-Manager (ABM), um Sprints zu ändern.'
    },
    fr: {
        'uni-vehicle-manager': 'UniVehicleCreator',
        'task-manager': 'Gestionnaire de Tâches (ABM)',
        'allTasks': 'Toutes les Tâches (Tableau)',
        'dispoplan': 'DispoPlan (Absences)',
        'solution-records': 'Registres de Solutions',
        'error_completed_immovable': 'Les tâches terminées ne peuvent pas être déplacées sur le tableau. Utilisez le Gestionnaire de Tâches (ABM) pour changer de sprint.'
    },
    pt: {
        'uni-vehicle-manager': 'UniVehicleCreator',
        'task-manager': 'Gestor de Tarefas (ABM)',
        'allTasks': 'Todas as Tarefas (Quadro)',
        'dispoplan': 'DispoPlan (Ausências)',
        'solution-records': 'Registros de Soluções',
        'error_completed_immovable': 'As tarefas concluídas não podem ser movidas pelo quadro. Use o Gestor de Tarefas (ABM) para alterar o sprint.'
    }
};

files.forEach(file => {
    const lang = file.split('.')[0];
    const langUpdates = updates[lang];
    if (!langUpdates) return;

    const filePath = path.join(localesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add "uni-vehicle-manager" in the nav section (after "uni-order-manager")
    if (!content.includes('uni-vehicle-manager')) {
        const orderManagerRegex = /"uni-order-manager":\s*"[^"]*",?/g;
        content = content.replace(orderManagerRegex, (match) => {
            return `${match}\n        "uni-vehicle-manager": "${langUpdates['uni-vehicle-manager']}",`;
        });
    }

    // 2. Update wording for modified keys in the nav section and other sections
    // Use simple replaces to update the translations
    const replaces = [
        {
            key: 'task-manager',
            regex: /"task-manager":\s*"[^"]*"/g,
            rep: `"task-manager": "${langUpdates['task-manager']}"`
        },
        {
            key: 'allTasks',
            regex: /allTasks:\s*"[^"]*"/g,
            rep: `allTasks: "${langUpdates['allTasks']}"`
        },
        {
            key: 'dispoplan',
            regex: /dispoplan:\s*"[^"]*"/g,
            rep: `dispoplan: "${langUpdates['dispoplan']}"`
        },
        {
            key: 'solution-records',
            regex: /"solution-records":\s*"[^"]*"/g,
            rep: `"solution-records": "${langUpdates['solution-records']}"`
        },
        {
            key: 'error_completed_immovable',
            regex: /error_completed_immovable:\s*"[^"]*"/g,
            rep: `error_completed_immovable: "${langUpdates['error_completed_immovable']}"`
        }
    ];

    replaces.forEach(r => {
        content = content.replace(r.regex, r.rep);
    });

    // Specific to solution-records inside knowledge_base as well
    if (lang === 'es') {
        content = content.replace(/solution_records:\s*"Biblioteca de Conocimiento"/g, 'solution_records: "Registros de Soluciones"');
    } else if (lang === 'en') {
        content = content.replace(/solution_records:\s*"Knowledge Library"/g, 'solution_records: "Solution Records"');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});
