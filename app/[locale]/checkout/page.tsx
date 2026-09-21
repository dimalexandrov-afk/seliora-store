'use client';

import Link from 'next/link';
import {FormEvent,useState} from 'react';
import {useParams} from 'next/navigation';
import {useCart} from '@/components/CartProvider';
import {supabase} from '@/lib/supabase-browser';

export default function CheckoutPage(){
  const params=useParams<{locale:string}>();
  const locale=params.locale;
  const bg=locale==='bg';
  const{items,subtotal,clear}=useCart();
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[success,setSuccess]=useState<{order_number:number;total_eur:number}|null>(null);

  const[firstName,setFirstName]=useState('');
  const[lastName,setLastName]=useState('');
  const[email,setEmail]=useState('');
  const[phone,setPhone]=useState('');
  const[address,setAddress]=useState('');
  const[city,setCity]=useState('');
  const[postalCode,setPostalCode]=useState('');
  const[country,setCountry]=useState(bg?'България':'Bulgaria');
  const[notes,setNotes]=useState('');

  async function placeOrder(e:FormEvent){
    e.preventDefault();
    if(!items.length)return;
    setBusy(true);setError('');
    const{data,error:rpcError}=await supabase.rpc('create_store_order',{
      p_email:email,
      p_first_name:firstName,
      p_last_name:lastName,
      p_phone:phone,
      p_shipping_address:{
        delivery_method:'courier',
        address,
        city,
        postal_code:postalCode,
        country
      },
      p_notes:notes,
      p_items:items.map(i=>({variant_id:i.variantId,quantity:i.qty}))
    });
    setBusy(false);
    if(rpcError){setError(rpcError.message);return}
    const result=Array.isArray(data)?data[0]:data;
    if(!result){setError(bg?'Поръчката не можа да бъде създадена.':'The order could not be created.');return}
    setSuccess({order_number:Number(result.order_number),total_eur:Number(result.total_eur)});
    clear();
  }

  if(success)return <main className="wrap checkoutsuccess">
    <div className="eyebrow">{bg?'Поръчката е приета':'Order received'}</div>
    <h1>{bg?'Благодарим!':'Thank you!'}</h1>
    <p className="lead">{bg?'Номер на поръчка':'Order number'}: <strong>#{success.order_number}</strong></p>
    <p>{bg?'Общо':'Total'}: <strong>€{success.total_eur.toFixed(2)}</strong></p>
    <p className="microcopy">{bg?'Това е тестов checkout без онлайн плащане. Поръчката е записана в системата.':'This is the test checkout without online payment. Your order has been saved.'}</p>
    <Link className="btn primary" href={'/'+locale+'/shop'}>{bg?'Продължи към магазина':'Continue shopping'}</Link>
  </main>;

  if(!items.length)return <main className="wrap"><div className="pagehead"><h1>{bg?'Checkout':'Checkout'}</h1></div><div className="emptycart"><p>{bg?'Кошницата е празна.':'Your bag is empty.'}</p><Link className="btn primary" href={'/'+locale+'/shop'}>{bg?'Към магазина':'Shop collection'}</Link></div></main>;

  return <main className="wrap">
    <div className="pagehead"><div className="eyebrow">{bg?'Финализиране':'Checkout'}</div><h1>{bg?'Данни за поръчката':'Order details'}</h1></div>
    <div className="checkoutlayout">
      <form className="checkoutform" onSubmit={placeOrder}>
        <div className="checkoutsection"><h2>{bg?'Контакт':'Contact'}</h2><div className="checkoutgrid">
          <label>{bg?'Име':'First name'}<input value={firstName} onChange={e=>setFirstName(e.target.value)} required/></label>
          <label>{bg?'Фамилия':'Last name'}<input value={lastName} onChange={e=>setLastName(e.target.value)} required/></label>
          <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
          <label>{bg?'Телефон':'Phone'}<input value={phone} onChange={e=>setPhone(e.target.value)} required/></label>
        </div></div>
        <div className="checkoutsection"><h2>{bg?'Доставка':'Delivery'}</h2><div className="checkoutgrid">
          <label className="wide">{bg?'Адрес':'Address'}<input value={address} onChange={e=>setAddress(e.target.value)} required/></label>
          <label>{bg?'Град':'City'}<input value={city} onChange={e=>setCity(e.target.value)} required/></label>
          <label>{bg?'Пощенски код':'Postal code'}<input value={postalCode} onChange={e=>setPostalCode(e.target.value)} required/></label>
          <label className="wide">{bg?'Държава':'Country'}<input value={country} onChange={e=>setCountry(e.target.value)} required/></label>
          <label className="wide">{bg?'Бележка към поръчката':'Order notes'}<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        </div></div>
        {error&&<div className="checkout-error">{error}</div>}
        <button className="btn primary addbtn" disabled={busy}>{busy?(bg?'Изпращане...':'Placing order...'):(bg?'Поръчай':'Place order')}</button>
        <p className="microcopy">{bg?'Онлайн плащането още не е активирано. Наличността се проверява отново при изпращане на поръчката.':'Online payment is not active yet. Stock is checked again when the order is placed.'}</p>
      </form>
      <aside className="checkoutsummary"><div className="eyebrow">{bg?'Поръчка':'Order'}</div>
        {items.map(i=><div className="checkoutitem" key={i.variantId}>
          <div className="checkoutthumb">{i.imageUrl&&<img src={i.imageUrl} alt={i.productName}/>}</div>
          <div><strong>{i.productName}</strong><span>{i.color} · {i.size} · ×{i.qty}</span></div>
          <b>€{(i.price*i.qty).toFixed(2)}</b>
        </div>)}
        <div className="checkouttotal"><span>{bg?'Общо':'Total'}</span><strong>€{subtotal.toFixed(2)}</strong></div>
        <p className="microcopy">{bg?'Доставката е в тестов режим и засега не се начислява отделна такса.':'Delivery is in test mode and no separate shipping fee is charged yet.'}</p>
      </aside>
    </div>
  </main>
}
