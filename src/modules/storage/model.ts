import { z } from 'zod';
import { appearanceSchema } from '@/modules/story/appearance';
import { passageSchema, editorLayoutSchema, type Story } from '@/modules/story/model';
import { mediaPlanSchema } from '@/modules/media/generation/plan';
import type { Publication } from '@/modules/publishing/model';
export const cloudDocumentSchema = z.object({
  startId: z.string().max(100), passages: z.array(passageSchema).min(1).max(150),
  assets: z.array(z.object({id:z.string().min(1).max(100),assetId:z.uuid(),name:z.string().min(1).max(200),credit:z.string().max(1000)})).max(300),
  editor:editorLayoutSchema.optional(),mediaPlan:mediaPlanSchema.optional(),appearance:appearanceSchema.optional(),
});
export const storedStorySchema = z.object({title:z.string().max(200),description:z.string().max(1000),genre:z.string().max(50),document:cloudDocumentSchema});
export type StoredStory = z.infer<typeof storedStorySchema>;
export type StorySummary = {id:string;title:string;description:string;genre:string;updatedAt:string;passageCount:number;endingCount:number;revision:number;status:string;coverSrc?:string;publication?:Publication|null};
export function openingImageId(story:Pick<Story,'startId'|'passages'>) {
  return story.passages.find(p=>p.id===story.startId)?.media.imageId || '';
}
export function summarize(story:Story,revision=0,status='ready'):StorySummary {
  const imageId=openingImageId(story);
  return {id:story.id,title:story.title,description:story.description,genre:story.genre,updatedAt:story.updatedAt,passageCount:story.passages.length,endingCount:story.passages.filter(p=>p.ending).length,revision,status,
    coverSrc:story.assets.find(a=>a.id===imageId&&a.kind==='image')?.data};
}
export type StorageStatus = {mode:'local'|'supabase';scope:string;ownerId?:string;available:boolean;error?:string};
export type AssetInfo = {id:string;kind:'image'|'audio';name:string;credit:string;source:'upload'|'legacy'|'catalog'|'generated';provenance?:unknown;mime_type:string;byte_size:number;sha256:string;state:string;created_at:string};
export type JobInfo = {id:string;kind:'story'|'image';status:string;created_at:string;error:string|null;result:{storyId?:string;assetId?:string;revision?:number;repaired?:boolean}|null};
