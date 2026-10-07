import { executeGeneration } from './steps';
export async function generationWorkflow(ownerId:string,jobId:string){
 'use workflow';
 await executeGeneration(ownerId,jobId);
}
