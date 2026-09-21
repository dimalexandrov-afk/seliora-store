'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import {supabase} from '@/lib/supabase-browser';

type Product={
  id:string;slug:string;name:string;subtitle:string|null;description:string|null;denier:number|null;finish:string|null;
  status:string;base_price_eur:number|null;launch_price_eur:number|null;featured:boolean;sort_order:number;
  image_url:string|null;image_alt:string|null;
};

type Variant={id:string;product_id:string;sku:string;color_name:string;size_label:string;active:boolean};
type Stock={variant_id:string;quantity_on_hand:number;quantity_reserved:number;reorder_level:number};

export default function AdminPage(){
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[logged,setLogged]=useState(false);
  const[authorized,setAuthorized]=useState(false);
  const[products,setProducts]=useState<Product[]>([]);
  const[selectedId,setSelectedId]=useState('');
  const[variants,setVariants]=useState<Variant[]>([]);
  const[stock,setStock]=useState<Stock[]>([]);
  const[msg,setMsg]=useState('');
  const[busy,setBusy]=useState(false);

  const selected=useMemo(()=>products.find(p=>p.id===selectedId)??null,[products,selectedId]);

  useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session){setLogged(true);checkAccess();}})},[]);

  async function checkAccess(){
    const{data,error}=await supabase.from('admin_users').select('user_id').limit(1);
    const ok=!error&&!!data?.length;
    setAuthorized(ok);
    if(ok)await loadProducts();
  }

  async function login(e:FormEvent){
    e.preventDefault();setMsg('');setBusy(true);
    const{error}=await supabase.auth.signInWithPassword({email,password});
    setBusy(false);
    if(error){setMsg(error.message);return}
    setLogged(true);await checkAccess();
  }

  async function logout(){await supabase.auth.signOut();setLogged(false);setAuthorized(false);setProducts([]);}

  async function loadProducts(){
    const{data,error}=await supabase.from('products').select('*').order('sort_order');
    if(error){setMsg(error.message);return}
    setProducts(data??[]);
    if(data?.length&&!selectedId){setSelectedId(data[0].id);await loadVariants(data[0].id);}
  }

  async function loadVariants(productId:string){
    setSelectedId(productId);
    const{data:v,error}=await supabase.from('product_variants').select('id,product_id,sku,color_name,size_label,active').eq('product_id',productId).order('size_label');
    if(error){setMsg(error.message);return}
    setVariants(v??[]);
    const ids=(v??[]).map(x=>x.id);
    if(!ids.length){setStock([]);return}
    const{data:s}=await supabase.from('inventory').select('*').in('variant_id',ids);
    setStock(s??[]);
  }

  function patchProduct(field:keyof Product,value:any){
    setProducts(ps=>ps.map(p=>p.id===selectedId?{...p,[field]:value}:p));
  }

  async function saveProduct(){
    if(!selected)return;setBusy(true);setMsg('');
    const payload={
      name:selected.name,subtitle:selected.subtitle,description:selected.description,denier:selected.denier,finish:selected.finish,
      status:selected.status,base_price_eur:selected.base_price_eur,launch_price_eur:selected.launch_price_eur,
      featured:selected.featured,sort_order:selected.sort_order,image_url:selected.image_url,image_alt:selected.image_alt,updated_at:new Date().toISOString()
    };
    const{error}=await supabase.from('products').update(payload).eq('id',selected.id);
    setBusy(false);setMsg(error?error.message:'Запазено.');
  }

  async function saveStock(variantId:string,qty:number){
    setStock(s=>s.map(x=>x.variant_id===variantId?{...x,quantity_on_hand:qty}:x));
    const{error}=await supabase.from('inventory').update({quantity_on_hand:qty,updated_at:new Date().toISOString()}).eq('variant_id',variantId);
    setMsg(error?error.message:'Наличността е обновена.');
  }

  if(!logged)return <main className="adminshell"><div className="adminlogin"><div className="eyebrow">SELIORA CMS</div><h1>Администрация</h1><p>Вход за управление на продукти, цени и наличности.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Парола<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="btn primary addbtn" disabled={busy}>{busy?'Влизане...':'Вход'}</button></form>{msg&&<div className="adminmsg">{msg}</div>}</div></main>;

  if(!authorized)return <main className="adminshell"><div className="adminlogin"><div className="eyebrow">SELIORA CMS</div><h1>Няма достъп</h1><p>Потребителят е влязъл успешно, но още не е добавен като SELIORA администратор.</p><button className="btn" onClick={logout}>Изход</button></div></main>;

  return <main className="adminshell"><header className="adminbar"><div><strong>SELIORA CMS</strong><span>Catalog & inventory</span></div><button className="textbtn" onClick={logout}>Изход</button></header><div className="adminlayout"><aside className="adminproducts"><div className="adminsectiontitle">Продукти</div>{products.map(p=><button key={p.id} className={p.id===selectedId?'active':''} onClick={()=>loadVariants(p.id)}><strong>{p.name}</strong><span>{p.status} · {p.denier??'—'} DEN</span></button>)}</aside>{selected&&<section className="admineditor"><div className="adminheading"><div><div className="eyebrow">Редакция</div><h1>{selected.name}</h1></div><button className="btn primary" onClick={saveProduct} disabled={busy}>{busy?'Запазване...':'Запази'}</button></div><div className="adminformgrid"><label>Име<input value={selected.name} onChange={e=>patchProduct('name',e.target.value)}/></label><label>Slug<input value={selected.slug} disabled/></label><label className="wide">Кратко описание<input value={selected.subtitle??''} onChange={e=>patchProduct('subtitle',e.target.value)}/></label><label className="wide">Описание<textarea rows={5} value={selected.description??''} onChange={e=>patchProduct('description',e.target.value)}/></label><label>DEN<input type="number" value={selected.denier??''} onChange={e=>patchProduct('denier',e.target.value?Number(e.target.value):null)}/></label><label>Финиш<input value={selected.finish??''} onChange={e=>patchProduct('finish',e.target.value)}/></label><label>Редовна цена €<input type="number" step="0.01" value={selected.base_price_eur??''} onChange={e=>patchProduct('base_price_eur',e.target.value?Number(e.target.value):null)}/></label><label>Стартова цена €<input type="number" step="0.01" value={selected.launch_price_eur??''} onChange={e=>patchProduct('launch_price_eur',e.target.value?Number(e.target.value):null)}/></label><label>Статус<select value={selected.status} onChange={e=>patchProduct('status',e.target.value)}><option value="draft">draft</option><option value="active">active</option><option value="archived">archived</option></select></label><label>Подредба<input type="number" value={selected.sort_order} onChange={e=>patchProduct('sort_order',Number(e.target.value))}/></label><label className="wide">URL на продуктова снимка<input value={selected.image_url??''} onChange={e=>patchProduct('image_url',e.target.value)}/></label><label className="wide">Alt текст<input value={selected.image_alt??''} onChange={e=>patchProduct('image_alt',e.target.value)}/></label></div><div className="adminstock"><div className="adminsectiontitle">Наличности</div>{variants.map(v=>{const inv=stock.find(s=>s.variant_id===v.id);return <div className="stockrow" key={v.id}><div><strong>{v.size_label}</strong><span>{v.color_name} · {v.sku}</span></div><input type="number" min="0" value={inv?.quantity_on_hand??0} onChange={e=>saveStock(v.id,Number(e.target.value))}/></div>})}</div>{msg&&<div className="adminmsg">{msg}</div>}</section>}</div></main>
}
