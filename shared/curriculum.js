import content from './curriculum.json' with {type:'json'};
import {Chess} from 'chess.js';
export const courses=content.courses;
export const courseLessons=content.lessons.map(lesson=>({...lesson,challenges:lesson.challenges.map(challenge=>{
 if(!challenge.trigger)return challenge;
 const board=new Chess(challenge.initialFen),move=challenge.trigger;board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
 return {...challenge,fen:board.fen()};
})}));
export const curriculumCatalog=()=>({courses,lessons:courseLessons.map(lesson=>({...lesson,challenges:lesson.challenges.map(({solution,explanation,...challenge})=>challenge)}))});
