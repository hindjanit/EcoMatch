import { FileBlob, PresentationFile } from '@oai/artifact-tool';
const path='C:/Users/hindj/Downloads/EcoMatch_Pitch.pptx';
const p=await PresentationFile.importPptx(await FileBlob.load(path));
const x=await p.inspect({kind:'slide,textbox,shape,image,notes,layout',maxChars:20000});
console.log(x.ndjson);
