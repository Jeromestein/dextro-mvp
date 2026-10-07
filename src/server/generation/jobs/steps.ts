import { runGenerationJob } from './worker';
export async function executeGeneration(ownerId:string,jobId:string){
 'use step';
 await runGenerationJob(ownerId,jobId);
}
// A replay may recover persisted bytes, but SQL never reclaims dispatched calls.
executeGeneration.maxRetries=2;
