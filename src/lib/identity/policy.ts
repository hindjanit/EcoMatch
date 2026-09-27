export function demoEnabled(env:Record<string,string|undefined>=process.env){return env.ECOMATCH_DEMO_MODE==='true';}
export function requireDemo(env:Record<string,string|undefined>=process.env){if(!demoEnabled(env))throw new Error('Demo identity verification is disabled');}
export const CHALLENGES=['Turn your head LEFT','Turn your head RIGHT','Blink','Look straight at camera','Smile'] as const;
