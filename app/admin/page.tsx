'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import {supabase} from '@/lib/supabase-browser';

type Product={
  id:string;slug:string;name:string;subtitle:string|null;description:string|null;denier:number|null;finish:string|null;
  status:string;base_price_eur:number|null;launch_price_eur:number|null;featured:boolean;sort_order:number;
  toe_type:string|null;waistband_type:string|null;material_composition:string|null;care_instructions:string|null;
};
type Variant={id:string;product_id:string;sku:string;color_name:string;color_hex:string|null;size_label:string;active:boolean;sort_order:number};
type Stock={variant_id:string;quantity_on_hand:number;quantity_reserved:number;reorder_level:number};
type ProductImage={id:string;product_id:string;storage_path:string;alt_text:string|null;sort_order:number;is_primary:boolean;is_hover:boolean;color_name:string|null};

const PUBLIC_BASE='https://yclgswebvkiilmescehw.supabase.co/storage/v1/object/public/product-images/';
function publicUrl(path:string){return PUBLIC_BASE+path.split('/').map(encodeURIComponent).join('/')}

export default function AdminPage(){
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[logged,setLogged]=useState(false);
  const[authorized,setAuthorized]=useState(false);
  const[products,setProducts]=useState<Product[]>([]);
  const[selectedId,setSelectedId]=useState('');
  const[variants,setVariants]=useState<Variant[]>([]);
  const[stock,setStock]=useState<Stock[]>([]);
  const[images,setImages]=useState<ProductImage[]>([]);
  const[msg,setMsg]=useState('');
  const[busy,setBusy]=useState(false);
  const[uploading,setUploading]=useState(false);
  const[uploadColor,setUploadColor]=useState('');
  const[newColorName,setNewColorName]=useState('');
  const[newColorHex,setNewColorHex]=useState('#171717');
  const[newProductName,setNewProductName]=useState('');

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
    if(data?.length&&!selectedId)await selectProduct(data[0].id);
  }

  async function selectProduct(productId:string){
    setSelectedId(productId);setMsg('');
    const[{data:v,error},{data:imgs}]=await Promise.all([
      supabase.from('product_variants').select('id,product_id,sku,color_name,color_hex,size_label,active,sort_order').eq('product_id',productId).order('size_label'),
      supabase.from('product_images').select('*').eq('product_id',productId).order('sort_order')
    ]);
    if(error){setMsg(error.message);return}
    setVariants(v??[]);setImages(imgs??[]);
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
      featured:selected.featured,sort_order:selected.sort_order,toe_type:selected.toe_type,waistband_type:selected.waistband_type,
      material_composition:selected.material_composition,care_instructions:selected.care_instructions,updated_at:new Date().toISOString()
    };
    const{error}=await supabase.from('products').update(payload).eq('id',selected.id);
    setBusy(false);setMsg(error?error.message:'Запазено.');
  }

  async function saveStock(variantId:string,qty:number){
    setStock(s=>s.map(x=>x.variant_id===variantId?{...x,quantity_on_hand:qty}:x));
    const{error}=await supabase.from('inventory').update({quantity_on_hand:qty,updated_at:new Date().toISOString()}).eq('variant_id',variantId);
    setMsg(error?error.message:'Наличността е обновена.');
  }

  async function uploadImages(files:FileList|null){
    if(!selected||!files?.length)return;
    setUploading(true);setMsg('');
    let nextOrder=images.length?Math.max(...images.map(i=>i.sort_order))+1:0;
    let hasPrimary=images.some(i=>i.is_primary);
    for(const file of Array.from(files)){
      if(!file.type.startsWith('image/'))continue;
      const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
      const path=selected.slug+'/'+crypto.randomUUID()+'-'+safe;
      const{error:uploadError}=await supabase.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false});
      if(uploadError){setMsg(uploadError.message);continue}
      const{error:insertError}=await supabase.from('product_images').insert({
        product_id:selected.id,storage_path:path,alt_text:selected.name,sort_order:nextOrder,is_primary:!hasPrimary,color_name:uploadColor||null
      });
      if(insertError){await supabase.storage.from('product-images').remove([path]);setMsg(insertError.message);continue}
      hasPrimary=true;nextOrder++;
    }
    setUploading(false);await selectProduct(selected.id);
    setMsg('Снимките са качени.');
  }

  async function deleteImage(img:ProductImage){
    if(!selected)return;
    setMsg('');
    const{error:storageError}=await supabase.storage.from('product-images').remove([img.storage_path]);
    if(storageError){setMsg(storageError.message);return}
    const{error}=await supabase.from('product_images').delete().eq('id',img.id);
    if(error){setMsg(error.message);return}
    const remaining=images.filter(i=>i.id!==img.id);
    if(img.is_primary&&remaining.length)await supabase.from('product_images').update({is_primary:true}).eq('id',remaining[0].id);
    await selectProduct(selected.id);
  }

  async function setPrimary(id:string){
    if(!selected)return;
    await supabase.from('product_images').update({is_primary:false}).eq('product_id',selected.id);
    const{error}=await supabase.from('product_images').update({is_primary:true}).eq('id',id);
    setMsg(error?error.message:'Основната снимка е сменена.');
    await selectProduct(selected.id);
  }

  async function setHover(id:string){
    if(!selected)return;
    await supabase.from('product_images').update({is_hover:false}).eq('product_id',selected.id);
    const{error}=await supabase.from('product_images').update({is_hover:true}).eq('id',id);
    setMsg(error?error.message:'Hover снимката е сменена.');
    await selectProduct(selected.id);
  }

  async function moveImage(img:ProductImage,dir:-1|1){
    if(!selected)return;
    const ordered=[...images].sort((a,b)=>a.sort_order-b.sort_order);
    const idx=ordered.findIndex(i=>i.id===img.id);
    const swap=ordered[idx+dir];
    if(!swap)return;
    await Promise.all([
      supabase.from('product_images').update({sort_order:swap.sort_order}).eq('id',img.id),
      supabase.from('product_images').update({sort_order:img.sort_order}).eq('id',swap.id)
    ]);
    await selectProduct(selected.id);
  }

  async function updateAlt(id:string,alt:string){
    setImages(xs=>xs.map(x=>x.id===id?{...x,alt_text:alt}:x));
    await supabase.from('product_images').update({alt_text:alt}).eq('id',id);
  }

  async function updateImageColor(id:string,colorName:string){
    const value=colorName||null;
    setImages(xs=>xs.map(x=>x.id===id?{...x,color_name:value}:x));
    const{error}=await supabase.from('product_images').update({color_name:value}).eq('id',id);
    if(error)setMsg(error.message);
  }

  async function addColor(){
    if(!selected||!newColorName.trim())return;
    const name=newColorName.trim();
    if(variants.some(v=>v.color_name.toLowerCase()===name.toLowerCase())){setMsg('Този цвят вече съществува.');return}
    const sizes=[...new Set(variants.map(v=>v.size_label))];
    if(!sizes.length){setMsg('Няма базови размери за клониране.');return}
    const code=name.toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,10)||'COLOR';
    const prefix=selected.slug.toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,12);
    const rows=sizes.map(size=>({product_id:selected.id,sku:prefix+'-'+code+'-'+size,color_name:name,color_hex:newColorHex||null,size_label:size,active:true}));
    const{data,error}=await supabase.from('product_variants').insert(rows).select('id');
    if(error){setMsg(error.message);return}
    if(data?.length)await supabase.from('inventory').insert(data.map(v=>({variant_id:v.id,quantity_on_hand:0,quantity_reserved:0,reorder_level:3})));
    setNewColorName('');setMsg('Цветът е добавен.');
    await selectProduct(selected.id);
  }

  async function setColorActive(colorName:string,active:boolean){
    if(!selected)return;
    const{error}=await supabase.from('product_variants').update({active}).eq('product_id',selected.id).eq('color_name',colorName);
    setMsg(error?error.message:(active?'Цветът е активиран.':'Цветът е скрит от магазина.'));
    await selectProduct(selected.id);
  }



  async function createProduct(){
    const name=newProductName.trim();
    if(!name)return;
    const slugBase=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'product';
    let slug=slugBase;
    let n=2;
    while(products.some(p=>p.slug===slug)){slug=slugBase+'-'+n;n++}
    const nextOrder=products.length?Math.max(...products.map(p=>p.sort_order))+1:1;
    const{data,error}=await supabase.from('products').insert({
      slug,name,subtitle:'',description:'',status:'draft',featured:false,sort_order:nextOrder
    }).select('*').single();
    if(error){setMsg(error.message);return}
    setProducts(ps=>[...ps,data]);
    setNewProductName('');
    await selectProduct(data.id);
    setMsg('Новият продукт е създаден като draft.');
  }

  async function duplicateProduct(){
    if(!selected)return;
    const base=(selected.name+' Copy').trim();
    const slugBase=(selected.slug+'-copy').replace(/[^a-z0-9-]+/g,'');
    let slug=slugBase;let n=2;
    while(products.some(p=>p.slug===slug)){slug=slugBase+'-'+n;n++}
    const{data,error}=await supabase.from('products').insert({
      slug,name:base,subtitle:selected.subtitle,description:selected.description,denier:selected.denier,finish:selected.finish,
      status:'draft',base_price_eur:selected.base_price_eur,launch_price_eur:selected.launch_price_eur,featured:false,
      sort_order:Math.max(...products.map(p=>p.sort_order),0)+1,toe_type:selected.toe_type,waistband_type:selected.waistband_type,
      material_composition:selected.material_composition,care_instructions:selected.care_instructions
    }).select('*').single();
    if(error){setMsg(error.message);return}
    const sourceVariants=variants.map(v=>({
      product_id:data.id,sku:(data.slug+'-'+v.color_name+'-'+v.size_label).toUpperCase().replace(/[^A-Z0-9-]+/g,'-'),
      color_name:v.color_name,color_hex:v.color_hex,size_label:v.size_label,active:false,sort_order:v.sort_order
    }));
    if(sourceVariants.length){
      const{data:newVariants}=await supabase.from('product_variants').insert(sourceVariants).select('id');
      if(newVariants?.length)await supabase.from('inventory').insert(newVariants.map(v=>({variant_id:v.id,quantity_on_hand:0,quantity_reserved:0,reorder_level:3})));
    }
    await loadProducts();await selectProduct(data.id);setMsg('Продуктът е дублиран като draft. Снимките не се копират.');
  }

  async function archiveProduct(){
    if(!selected)return;
    const{error}=await supabase.from('products').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',selected.id);
    if(error){setMsg(error.message);return}
    await loadProducts();setMsg('Продуктът е архивиран.');
  }

  async function setVariantActive(id:string,active:boolean){
    const{error}=await supabase.from('product_variants').update({active}).eq('id',id);
    if(error){setMsg(error.message);return}
    setVariants(vs=>vs.map(v=>v.id===id?{...v,active}:v));
  }

  async function updateVariantSku(id:string,sku:string){
    setVariants(vs=>vs.map(v=>v.id===id?{...v,sku}:v));
    const{error}=await supabase.from('product_variants').update({sku}).eq('id',id);
    if(error)setMsg(error.message);
  }

  if(!logged)return <main className="adminshell"><div className="adminlogin"><div className="eyebrow">SELIORA CMS</div><h1>Администрация</h1><p>Вход за управление на продукти, снимки, цени и наличности.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Парола<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="btn primary addbtn" disabled={busy}>{busy?'Влизане...':'Вход'}</button></form>{msg&&<div className="adminmsg">{msg}</div>}</div></main>;

  if(!authorized)return <main className="adminshell"><div className="adminlogin"><div className="eyebrow">SELIORA CMS</div><h1>Няма достъп</h1><p>Потребителят е влязъл успешно, но не е SELIORA администратор.</p><button className="btn" onClick={logout}>Изход</button></div></main>;

  return <main className="adminshell"><header className="adminbar"><div><strong>SELIORA CMS</strong><span>Catalog · images · inventory</span></div><div className="adminbarnav"><a href="/admin/orders">Orders</a><button className="textbtn" onClick={logout}>Изход</button></div></header><div className="adminlayout"><aside className="adminproducts"><div className="adminsectiontitle">Продукти</div><div className="newproduct"><input placeholder="Нов продукт" value={newProductName} onChange={e=>setNewProductName(e.target.value)}/><button onClick={createProduct}>+</button></div>{products.map(p=><button key={p.id} className={p.id===selectedId?'active':''} onClick={()=>selectProduct(p.id)}><strong>{p.name}</strong><span>{p.status} · {p.denier??'—'} DEN</span></button>)}</aside>{selected&&<section className="admineditor"><div className="adminheading"><div><div className="eyebrow">Редакция</div><h1>{selected.name}</h1></div><div className="adminheadingactions"><a className="btn" href={'/bg/product/'+selected.slug} target="_blank">Preview</a><button className="btn" onClick={duplicateProduct}>Дублирай</button><button className="btn" onClick={archiveProduct}>Архивирай</button><button className="btn primary" onClick={saveProduct} disabled={busy}>{busy?'Запазване...':'Запази'}</button></div></div><div className="adminformgrid"><label>Име<input value={selected.name} onChange={e=>patchProduct('name',e.target.value)}/></label><label>Slug<input value={selected.slug} disabled/></label><label className="wide">Кратко описание<input value={selected.subtitle??''} onChange={e=>patchProduct('subtitle',e.target.value)}/></label><label className="wide">Описание<textarea rows={5} value={selected.description??''} onChange={e=>patchProduct('description',e.target.value)}/></label><label>DEN<input type="number" value={selected.denier??''} onChange={e=>patchProduct('denier',e.target.value?Number(e.target.value):null)}/></label><label>Финиш<input value={selected.finish??''} onChange={e=>patchProduct('finish',e.target.value)}/></label><label>Редовна цена €<input type="number" step="0.01" value={selected.base_price_eur??''} onChange={e=>patchProduct('base_price_eur',e.target.value?Number(e.target.value):null)}/></label><label>Стартова цена €<input type="number" step="0.01" value={selected.launch_price_eur??''} onChange={e=>patchProduct('launch_price_eur',e.target.value?Number(e.target.value):null)}/></label><label>Статус<select value={selected.status} onChange={e=>patchProduct('status',e.target.value)}><option value="draft">draft</option><option value="active">active</option><option value="archived">archived</option></select></label><label>Подредба<input type="number" value={selected.sort_order} onChange={e=>patchProduct('sort_order',Number(e.target.value))}/></label><label>Тип пръсти<input value={selected.toe_type??''} onChange={e=>patchProduct('toe_type',e.target.value)}/></label><label>Колан<input value={selected.waistband_type??''} onChange={e=>patchProduct('waistband_type',e.target.value)}/></label><label className="wide">Състав<input value={selected.material_composition??''} onChange={e=>patchProduct('material_composition',e.target.value)}/></label><label className="wide">Грижа<textarea rows={3} value={selected.care_instructions??''} onChange={e=>patchProduct('care_instructions',e.target.value)}/></label></div>

  <div className="adminimages"><div className="adminsectiontitle">Продуктови снимки</div><div className="imageuploadcontrols"><label>Цвят за новите снимки<select value={uploadColor} onChange={e=>setUploadColor(e.target.value)}><option value="">Всички цветове / общи</option>{[...new Set(variants.map(v=>v.color_name))].map(c=><option key={c} value={c}>{c}</option>)}</select></label></div><label className="uploadbox"><strong>{uploading?'Качване...':'Качи снимки'}</strong><span>Може да избереш няколко JPG, PNG, WebP или AVIF файла наведнъж. До 8 MB на файл.</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploading} onChange={e=>uploadImages(e.target.files)}/></label>{!images.length&&<p className="microcopy">Още няма качени снимки за този продукт.</p>}<div className="adminimagegrid">{[...images].sort((a,b)=>a.sort_order-b.sort_order).map((img,idx)=><article className="adminimagecard" key={img.id}><div className="adminimagepreview"><img src={publicUrl(img.storage_path)} alt={img.alt_text??selected.name}/>{img.is_primary&&<span>Основна</span>}{img.is_hover&&<span className="hoverbadge">Hover</span>}</div><input value={img.alt_text??''} onChange={e=>updateAlt(img.id,e.target.value)} placeholder="Alt текст"/><select className="imagecolorselect" value={img.color_name??''} onChange={e=>updateImageColor(img.id,e.target.value)}><option value="">Всички цветове / обща</option>{[...new Set(variants.map(v=>v.color_name))].map(c=><option key={c} value={c}>{c}</option>)}</select><div className="imageactions"><button disabled={idx===0} onClick={()=>moveImage(img,-1)}>←</button><button disabled={idx===images.length-1} onClick={()=>moveImage(img,1)}>→</button><button onClick={()=>setPrimary(img.id)} disabled={img.is_primary}>Основна</button><button onClick={()=>setHover(img.id)} disabled={img.is_hover}>Hover</button><button className="danger" onClick={()=>deleteImage(img)}>Изтрий</button></div></article>)}</div></div>

  <div className="admincolors"><div className="adminsectiontitle">Цветове и варианти</div><div className="coloradd"><input placeholder="Нов цвят, напр. Navy" value={newColorName} onChange={e=>setNewColorName(e.target.value)}/><input type="color" value={newColorHex} onChange={e=>setNewColorHex(e.target.value)}/><button className="btn" onClick={addColor}>Добави цвят</button></div><div className="colorlist">{[...new Map(variants.map(v=>[v.color_name,{name:v.color_name,hex:v.color_hex,active:variants.some(x=>x.color_name===v.color_name&&x.active)}])).values()].map(c=><div className="colorrow" key={c.name}><span className="colorswatch" style={{background:c.hex||'#777'}}/><strong>{c.name}</strong><span>{variants.filter(v=>v.color_name===c.name).length} размера</span><button className="textbtn" onClick={()=>setColorActive(c.name,!c.active)}>{c.active?'Скрий':'Активирай'}</button></div>)}</div></div>

  <div className="adminstock"><div className="adminsectiontitle">Наличности и варианти</div>{variants.map(v=>{const inv=stock.find(s=>s.variant_id===v.id);return <div className="stockrow stockrowfull" key={v.id}><div><strong>{v.color_name} · {v.size_label}</strong><input className="skuinput" value={v.sku} onChange={e=>updateVariantSku(v.id,e.target.value)}/></div><label className="varianttoggle"><input type="checkbox" checked={v.active} onChange={e=>setVariantActive(v.id,e.target.checked)}/> Активен</label><input type="number" min="0" value={inv?.quantity_on_hand??0} onChange={e=>saveStock(v.id,Number(e.target.value))}/></div>})}</div>{msg&&<div className="adminmsg">{msg}</div>}</section>}</div></main>
}
