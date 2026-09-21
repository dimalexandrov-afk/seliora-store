export type StoreProduct={id:string;slug:string;name:string;subtitle:string|null;description:string|null;denier:number|null;finish:string|null;base_price_eur:number|null;launch_price_eur:number|null;sort_order:number;product_variants?:{id:string;sku:string;color_name:string;color_hex:string|null;size_label:string;active:boolean}[]};

const SUPABASE_URL='https://yclgswebvkiilmescehw.supabase.co';
const SUPABASE_KEY='sb_publishable_i8wviNRTktw1iSJhOUsp2Q_vOJzZj7Z';

async function supabaseFetch(path:string){const res=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY},next:{revalidate:60}});if(!res.ok)throw new Error('Supabase request failed: '+res.status);return res.json();}

export async function getProducts():Promise<StoreProduct[]>{try{return await supabaseFetch('products?select=id,slug,name,subtitle,description,denier,finish,base_price_eur,launch_price_eur,sort_order,product_variants(id,sku,color_name,color_hex,size_label,active)&status=eq.active&order=sort_order.asc')}catch{return []}}
export async function getProduct(slug:string):Promise<StoreProduct|null>{try{const rows=await supabaseFetch('products?select=id,slug,name,subtitle,description,denier,finish,base_price_eur,launch_price_eur,sort_order,product_variants(id,sku,color_name,color_hex,size_label,active)&status=eq.active&slug=eq.'+encodeURIComponent(slug)+'&limit=1');return rows[0]??null}catch{return null}}
export function money(v:number|null|undefined){return typeof v==='number'?new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(v):'—'}
