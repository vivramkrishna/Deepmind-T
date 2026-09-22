import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';
import { resolvePresentationFont, finalizePresentation } from '/home/vivek/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations/container_tools/artifact_tool_utils.mjs';
const dir='/home/vivek/Work/code/voice-check/elevan-labs/plugin-comparison';
const skill='/home/vivek/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
const family=resolvePresentationFont();
const p=Presentation.create({slideSize:{width:1280,height:720}});
function text(s,t,x,y,w,h,size=26,color='#18383C',bold=false,fill='none'){
 const a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill,line:{fill:'none',width:0}});a.text=t;a.text.style={typeface:family,fontSize:size,color,bold,autoFit:'none'};return a;
}
function row(s,items,y){ const w=240,gap=54,start=72; items.forEach((item,i)=>{text(s,item,start+i*(w+gap),y,w,92,24,'#18383C',true,'#E0EFEB');if(i<items.length-1)text(s,'→',start+w+i*(w+gap)+10,y+22,36,50,30);}); }
const specs=[
 ['Voice Math architecture',[
  [['Chrome extension','Browser app','Local math API','Answer in app'],220],
  [['Browser app','Session endpoint','ElevenLabs API','Signed URL'],375]
 ],'Live audio travels directly between the browser and ElevenLabs.', 'The Chrome extension opens the app with selected text. Without a live session, text uses local mathjs. The server obtains a signed URL using the API key and agent ID.'],
 ['Live voice and calculator calls',[
  [['Microphone','Browser SDK','ElevenLabs agent','Spoken response'],200],
  [['Agent tool call','Browser callback','Local math API','Result to agent'],375]
 ],'The calculator runs locally; the conversation runs in ElevenLabs.', 'The SDK uses a WebSocket connection. The calculate client tool calls POST /api/calculate; the SDK returns its result to the agent. The lower row summarizes the return via the browser.'],
 ['An API key creates the agent ID',[
  [['API key in .env','agent:setup script','Create agent API','Save .agent-id'],245]
 ],'You supply the API key. The setup command saves the agent ID.', 'The saved agent ID is required internally. An explicit configured ID takes priority over the saved file. Restart the app after creating the agent. No actual secret values are included in this diagram.'],
 ['Demo math needs no credentials',[
  [['Select or type','Browser app','Express + mathjs','Show answer'],230]
 ],'Example: 15% of 200 = 30', 'The extension passes selected text through a URL parameter. The app submits it to POST /api/calculate. Live voice remains disabled until both key and agent ID are configured.']
];
for(const [i,[title,rows,note,notes]] of specs.entries()){
 const s=p.slides.add();s.background.fill='#F8FAFA';text(s,'PRESENTATIONS / VOICE MATH',72,38,1100,30,16,'#567376');text(s,title,72,95,1120,96,46,'#18383C',true);
 rows.forEach(([items,y])=>row(s,items,y));text(s,note,72,570,1120,78,28);text(s,`${i+1} / 4`,1120,665,90,25,16);
 s.speakerNotes.textFrame.setText(notes+' Source: elevan-labs/src/main.js; server/index.js; extension/background.js; scripts/create-agent.js.');
 await fs.writeFile(`${dir}/build/presentations-${i+1}.png`,new Uint8Array(await (await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
}
await (await PresentationFile.exportPptx(p)).save(`${dir}/build/presentations-draft.pptx`);
const result=await finalizePresentation({workspaceDir:dir,candidatePath:`${dir}/build/presentations-draft.pptx`,finalPath:`${dir}/output/presentations-voice-math.pptx`,pythonExecutable:'/home/vivek/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',integrityValidatorPath:`${skill}/container_tools/inspect_presentation_package_integrity.py`,layoutValidatorPath:`${skill}/container_tools/inspect_presentation_layout_geometry.py`,layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],fontPolicy:{basis:'design',families:[family]},verifyArtifactToolImport:true,receiptPath:`${dir}/build/validation.json`});
console.log(JSON.stringify(result));
