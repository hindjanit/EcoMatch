import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile,FileBlob} from '@oai/artifact-tool';
const ROOT='C:/Users/hindj/jaavaa/ecomatch';
const TMP=ROOT+'/.pitch-build-20260922';
const SKILL='C:/Users/hindj/.codex/plugins/cache/openai-primary-runtime/presentations/26.915.20218/skills/presentations';
const {finalizePresentation}=await import(pathToFileURL(SKILL+'/container_tools/artifact_tool_utils.mjs').href);
const OUT=ROOT+'/output/EcoMatch_Pitch.pptx';
const p=Presentation.create({slideSize:{width:1600,height:900}});
const C={forest:'#0B2118',paper:'#F3F4E9',lime:'#B9FF66',ink:'#10251B',muted:'#587062',white:'#F6F7EE',pale:'#BCD0C0'};
const F='Arial';
function text(s,t,x,y,w,h,size=34,color=C.ink,bold=false){const a=s.shapes.add({geometry:'textbox',name:t.slice(0,55),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});a.text=t;a.text.style={typeface:F,fontSize:size,bold,color,autoFit:'none',verticalAlignment:'top'};return a;}
function slide(title='',theme='light'){const s=p.slides.add();s.background.fill=theme==='light'?C.paper:C.forest;if(title)text(s,title,76,64,1430,142,58,theme==='light'?C.ink:C.white,true);text(s,String(p.slides.items.length).padStart(2,'0'),1465,845,55,30,20,theme==='light'?C.muted:C.pale);return s;}
function small(s,t,dark=false){text(s,t,78,816,1340,45,20,dark?C.pale:C.muted);}
function label(s,t,x,y,w=500,dark=false){text(s,t,x,y,w,55,30,dark?C.lime:C.muted,true);}
function notes(s,t,source=''){s.speakerNotes.textFrame.setText(t+'\n\n'+(source?'Sources: '+source:'Source: EcoMatch repository and deployed website, inspected 22–23 September 2026. https://eco-match-sepia.vercel.app/'));}
async function img(s,file,x,y,w,h,fit='contain',crop){s.images.add({blob:new Uint8Array(await fs.readFile(TMP+'/'+file)),contentType:'image/png',alt:file==='cover-art.png'?'Conceptual artwork of reusable equipment and materials':'Actual EcoMatch product interface',fit,position:{left:x,top:y,width:w,height:h},...(crop?{crop}:{})});}
async function productSlide(title,lead,body,file,foot,note,source=''){
 const s=slide(title,'dark');text(s,lead,78,244,535,190,49,C.lime,true);text(s,body.replace(/\n/g,' '),78,466,530,260,32,C.white);await img(s,file,650,213,876,582,'contain',file==='product.png'?{left:0.02,top:0.27,right:0.02,bottom:0.01}:undefined);small(s,foot,true);notes(s,note,source);return s;
}

// 01 / A clear cover with an original visual and editable typography.
let s=slide('','dark');await img(s,'cover-art.png',0,0,1600,900,'cover');
text(s,'EcoMatch',78,145,720,150,112,C.white,true);
text(s,'A better way\nto trade what\nalready exists.',80,339,660,280,66,C.lime,true);
text(s,'Circular material exchange',82,724,650,65,30,C.white);
notes(s,'25 sec. Namaste, hum EcoMatch bana rahe hain. Businesses ke paas jo usable stock aur equipment idle hai, use kisi aur ki supply banane mein help karte hain. Our focus is discovery, assessment and a documented exchange.','EcoMatch product positioning. Cover: original conceptual artwork created for this deck, not actual inventory.');

// 02 / One external statistic anchors the problem; no invented market size.
s=slide('Reuse needs a more dependable exchange');
text(s,'3×',78,241,645,235,192,C.ink,true);
text(s,'Global resource extraction\nin the past five decades',88,494,650,123,42,C.ink);
label(s,'THE LOCAL PROBLEM',866,229,620);
text(s,'Sellers need a next owner.\nBuyers need a reliable lot.',866,310,632,170,42,C.ink,true);
text(s,'Unclear condition, uncertain value\nand a difficult handover can keep\nreusable stock from moving.',866,514,631,179,35,C.muted);
small(s,'Resource statistic: UNEP, Global Resources Outlook 2024. Local problem framing is a product hypothesis.');
notes(s,'40 sec. UNEP ke 2024 report ke mutabik global resource extraction five decades mein three times hui. Yeh EcoMatch ka market-size number nahi hai. Local opportunity: existing assets ko assess aur exchange karna easier banana.','https://www.unep.org/resources/Global-Resource-Outlook-2024; product hypothesis based on EcoMatch workflows.');

// 03 / Product reveal.
await productSlide('EcoMatch connects discovery with exchange','Usable stock.\nA relevant buyer.\nA clear next step.','A marketplace for surplus materials\nand reusable equipment, with AI\nassistance and a shared deal flow.','home.png','Deployed web prototype: eco-match-sepia.vercel.app','35 sec. EcoMatch ko ek sentence mein explain karein: reusable assets ke liye marketplace jahan listing se handover tak information saath rehti hai. Homepage sourcing panel contains illustrative UI values; these are not traction metrics.');

// 04 / A real material listing anchors the pitch.
await productSlide('Material details before the first conversation','Assess the lot\nbefore the deal','Review photos and specifications.\nCheck available quantity.\nSee the asking price.\nThen contact the seller.','product.png','Actual product interface. Listing information still needs physical inspection.','40 sec. Ek real product listing dikhayein. Material, condition, quantity aur price ek jagah milte hain. Seller data aur photo inspection ko independent product testing ke barabar present na karein.','https://eco-match-sepia.vercel.app/marketplace; src/app/product/[id]/page.tsx.');

// 05 / Seller experience.
await productSlide('AI assistance makes listing easier','Less effort\nto describe\nan asset','Photo analysis suggests product\ndetails and condition cues.\nThe seller reviews the listing\nand sets the asking price.','listing.png','AI suggestions support the seller. They do not certify hidden condition or performance.','40 sec. Seller ko har detail scratch se type nahi karni padti. Vision route category, description aur visible condition suggest karta hai. Seller confirmation important hai. Price guidance is an estimate and may use a fallback.','src/app/seller/add-product/page.tsx; src/app/api/ai/analyze-product/route.ts; src/app/api/ai/price-intelligence/route.ts.');

// 06 / Buyer experience.
await productSlide('Human review before marketplace approval','A review step\nbefore publication','Admins inspect the product photos\nand submitted details.\nRisk signals help prioritize review.\nA person approves or rejects.','admin.png','Actual moderation interface. Automated risk scores help prioritize review.','30 sec. Listing marketplace mein aane se pehle admin product details aur images review karta hai. AI risk buckets review priority ke liye hain. Final approval human decision hai.','https://eco-match-sepia.vercel.app/admin; src/app/admin/page.tsx.');

await productSlide('Buyers can search in their own words','Describe\nwhat you need','Enter the material or use case\nin English or Hinglish.\nReview suggested lots and\ncheck the fit.','matching.png','Matching suggestions are advisory. Buyers verify quantity, budget and suitability.','40 sec. Buyer apni requirement natural language mein likhta hai. Relevant lots with match explanations appear. Match score is not a measured accuracy rate. The implementation has an AI path and a keyword fallback.','https://eco-match-sepia.vercel.app/ai-match; src/app/api/ai/match/route.ts.');

// 07 / Authenticated deal screen captured only from an existing deal.
await productSlide('A shared path to physical handover','Agreement\nbefore pickup','A deal records both participants.\nMeeting details guide the exchange.\nQR / OTP checks support handover.\nBoth sides confirm completion.','deal.png','Prototype handover workflow. Payment-provider escrow is a separate production requirement.','50 sec. Deal room trust ka practical part hai. Request, acceptance, meeting, handover verification aur completion ka sequence explain karein. Do not claim payment-provider escrow without integration evidence.','src/app/deals/[id]/page.tsx; supabase/phase16_safe_deal_and_calling_system.sql.');

// 08 / A durable record, with the blockchain boundary clearly stated.
await productSlide('A record beyond the conversation','Traceable\nownership\nevents','The ledger displays ownership\nevents and linked hashes.\nIt gives the exchange a record\nthat can be referenced later.','ledger.png','SHA-256 linked-record prototype. A decentralized blockchain is a future option.','35 sec. Ownership-event trail ko explain karein. Hash linking is present in the design, but this is not a deployed decentralized network. Do not describe UI tamper simulation as an independent security audit.','README.md; src/app/ledger/page.tsx; Supabase ownership_events schema.');

// 09 / A concrete value proposition instead of unsupported competitor claims.
s=slide('Why users would choose EcoMatch');
label(s,'FOR SELLERS',78,229,650);label(s,'FOR BUYERS',878,229,640);
text(s,'Make surplus\neasier to sell',78,319,650,180,64,C.ink,true);
text(s,'Turn photos into clearer listings.\nReach buyers with a matching need.\nCoordinate the exchange in one place.',78,554,650,170,35,C.muted);
text(s,'Make reuse\neasier to assess',878,319,635,180,64,C.ink,true);
text(s,'Search by intended use.\nCheck lot details before contact.\nKeep a shared handover record.',878,554,628,170,35,C.muted);
small(s,'Value propositions to validate in the first pilot.');
notes(s,'35 sec. Seller aur buyer ke liye practical value alag explain karein. We have built these workflows, and the pilot will test whether they reduce effort and uncertainty. Avoid claiming measured savings until observed.');

// 10 / Focused launch strategy.
s=slide('Local density before geographic expansion','dark');
text(s,'ONE LOCAL NETWORK',78,234,1370,71,39,C.lime,true);
text(s,'Workshops, small businesses\nand institutional surplus owners',78,340,1400,160,65,C.white,true);
const launch=[['01','Seed useful supply','Onboard relevant lots with clear\nphotos and specifications.'],['02','Recruit matching demand','Reach nearby buyers through\nlocal business networks.'],['03','Learn from each exchange','Watch where assessment or\nhandover still breaks down.']];
launch.forEach((a,i)=>{let x=78+i*505;text(s,a[0],x,555,100,80,58,C.lime,true);text(s,a[1],x,650,455,55,31,C.white,true);text(s,a[2],x,711,451,92,27,C.pale)});
notes(s,'40 sec. Proposed launch: ek compact local network mein relevant supply aur demand build karein. Broad categories product mein available hain, but pilot ko limited geography aur use cases par focus rakhenge. This is a proposed go-to-market plan, not current partnerships.');

// 11 / Hypotheses, without invented fees or revenue.
s=slide('A business model for repeat trade');
label(s,'PROPOSED REVENUE STREAMS',78,224,1400);
text(s,'Transaction fee',78,348,665,107,63,C.ink,true);
text(s,'Charge when the platform delivers\na completed exchange with useful\ncoordination and records.',78,500,650,180,36,C.muted);
text(s,'Business tools',874,348,632,107,63,C.ink,true);
text(s,'Offer paid tools for repeat sellers:\nbulk inventory, team workflows\nand reporting.',874,500,632,180,36,C.muted);
small(s,'Pricing and willingness to pay require pilot validation. Validate willingness to pay before setting fees.');
notes(s,'35 sec. Do proposed revenue options hain. Transaction fee tab viable hai jab completed exchange mein clear value ho. Pro tools repeat sellers ke liye. We have not assumed a fee percentage, current revenue or a forecast.');

// 12 / Measurable next milestone, not a fabricated traction slide.
s=slide('The next milestone is a focused pilot');
text(s,'90 days',78,235,700,198,140,C.ink,true);
text(s,'Proposed pilot horizon',89,451,656,72,32,C.muted);
text(s,'Validate real exchange behaviour',820,247,690,115,46,C.ink,true);
text(s,'Time to a suitable match\nCompleted handovers\nRepeat buyers and sellers\nDisputes and abandonment',820,419,675,247,37,C.muted);
text(s,'ASK',82,620,540,51,29,C.muted,true);
text(s,'Pilot partners and\nproduct feedback',82,680,687,115,47,C.ink,true);
small(s,'Pilot plan: validate the workflow first, then set commercial targets from observed results.');
notes(s,'40 sec. Next ask is access to a local pilot network, early users and feedback. Proposed 90-day timeline: user observation and onboarding, live supported trials, then iteration. Targets should come from baseline data, not invented traction.');

// 13 / Actual supplied team; roles are not fabricated.
s=slide('Team EcoMatch','dark');
text(s,'Janit Kumar Hind',78,249,1380,99,66,C.lime,true);
text(s,'Team leader',82,368,640,65,33,C.white);
text(s,'Krish Tiwari\nJeetu Yadav',82,510,660,170,46,C.white);
text(s,'Khushboo Sharma\nKhushi Kumari',864,510,657,170,46,C.white);
small(s,'hindjanit8@gmail.com     7982615157',true);
notes(s,'15 sec. Team members introduce karein. Specific roles only mention karein if agreed within the team.','Team name, member names and contact details provided by Janit Kumar Hind in this conversation.');

// 14 / A direct, memorable ask, reusing the cover background intentionally.
s=slide('','dark');await img(s,'cover-art.png',0,0,1600,900,'cover');
text(s,'EcoMatch',78,115,650,125,89,C.white,true);
text(s,'Let’s put\nuseful assets\nback to work.',78,305,700,287,68,C.lime,true);
text(s,'Seeking pilot partners\nand product feedback',82,643,660,95,34,C.white);
text(s,'eco-match-sepia.vercel.app',82,790,1000,50,29,C.white);
notes(s,'20 sec. Close: EcoMatch is ready for a focused pilot. Invite the audience to open the live prototype and help validate the exchange journey.','https://eco-match-sepia.vercel.app/; conceptual cover artwork.');

// 15 / Optional technical backup for Q&A.
s=slide('Technical foundation and next validation');
label(s,'BUILT IN THE PROTOTYPE',78,226,675);label(s,'NEXT VALIDATION',878,226,634);
text(s,'Next.js + React\nSupabase Auth, database and storage\nAI routes with fallback behaviour\nDeal and ownership-event workflows',78,341,700,280,36,C.ink);
text(s,'Complete exchange testing\nAI output quality and disclosure\nProduction identity and payment flow\nDocumented impact methodology',878,341,630,280,36,C.ink);
small(s,'Q&A backup. AI confidence scores and environmental estimates are not independent certifications.');
notes(s,'Backup slide, outside the main pitch. The public classifier is rules-based. Photo analysis and matching use external model routes with deterministic fallbacks. Pricing may use heuristics. Ledger records are hash-linked, not a decentralized blockchain. Certificates do not establish third-party regulatory certification.','package.json; README.md; src/lib/wasteClassifier.ts; src/app/api/ai/*; src/app/api/deals/epr-certificate/route.ts; src/app/ledger/page.tsx.');

const candidate=TMP+'/candidate.pptx';
await (await PresentationFile.exportPptx(p)).save(candidate);
await finalizePresentation({workspaceDir:ROOT,candidatePath:candidate,finalPath:OUT,pythonExecutable:'C:/Users/hindj/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:SKILL+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:SKILL+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','15240000,8572500','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:16,fontPolicy:{basis:'design',families:[F]},verifyArtifactToolImport:true,receiptPath:TMP+'/validation-final.json'});
const final=await PresentationFile.importPptx(await FileBlob.load(OUT));
for(let i=0;i<16;i++){const b=await final.export({slide:final.slides.getItem(i),format:'png',scale:0.85});await fs.writeFile(TMP+`/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await b.arrayBuffer()));}
console.log('CREATED',OUT);


