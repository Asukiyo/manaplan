export type SaveData = { id:string; name:string; grade:number; semester:"前期"|"後期"; registeredCourseIds:number[]; gameDate?:string; attackPoints?:number; completedCourseIds?:number[]; defeatedBossIds?:string[]; createdAt:string; updatedAt:string };
export type NewPlayer = Pick<SaveData,"name"|"grade"|"semester">;
