import QRCode from 'qrcode';
export function generateQrMatrix(text:string):boolean[][]{
 const {modules}=QRCode.create(text,{errorCorrectionLevel:'M'});
 return Array.from({length:modules.size},(_,r)=>Array.from({length:modules.size},(_,c)=>!!modules.get(r,c)));
}
export function generateQrSvg(text:string,size=180):string{
 const m=generateQrMatrix(text),n=m.length+8;
 const path=m.flatMap((row,r)=>row.flatMap((v,c)=>v?[`M${c+4} ${r+4}h1v1h-1z`]:[])).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg>`;
}
