import {IProject} from "@/types/project";

/**
 * Compute a unique display name for each project using the minimum number of
 * trailing path segments needed to disambiguate — same algorithm VS Code uses
 * for editor tabs. Projects with a customName bypass disambiguation entirely.
 */
function computeProjectDisplayNames(projects: IProject[]): Map<string, string> {
    const projectsToDisambiguate: IProject[] = projects.filter((p: IProject) => !p.customName);
    const depths: Map<string, number> = new Map(projectsToDisambiguate.map((project: IProject) => [project.rawProjectDir, 1]));

    let hasConflicts: boolean = true;
    while (hasConflicts) {
        hasConflicts = false;

        const currentNames: Map<string, string> = new Map();
        for (const [rawDir, depth] of depths) {
            const parts: string[] = rawDir.split('/').filter(Boolean);
            currentNames.set(rawDir, parts.slice(Math.max(0, parts.length - depth)).join('/'));
        }

        const nameGroups: Map<string, string[]> = new Map();
        for (const [rawDir, name] of currentNames) {
            if (!nameGroups.has(name)) nameGroups.set(name, []);
            nameGroups.get(name)!.push(rawDir);
        }

        for (const dirs of nameGroups.values()) {
            if (dirs.length > 1) {
                hasConflicts = true;
                for (const dir of dirs) {
                    const maxDepth: number = dir.split('/').filter(Boolean).length;
                    depths.set(dir, Math.min(depths.get(dir)! + 1, maxDepth));
                }
            }
        }
    }

    const result: Map<string, string> = new Map();
    for (const [rawDir, depth] of depths) {
        const parts: string[] = rawDir.split('/').filter(Boolean);
        result.set(rawDir, parts.slice(Math.max(0, parts.length - depth)).join('/') || rawDir);
    }
    for (const project of projects) {
        if (project.customName) result.set(project.rawProjectDir, project.customName);
    }
    return result;
}

export {computeProjectDisplayNames};