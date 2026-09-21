'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase-browser';

type OrderItem={id:string;product_name:string;color_name:string|null;size_label:string|null;quantity:number;unit_price_eur:number;line_total_eur:number};
type Customer={first_name:string|null;last_name:string|null;phone:string|null};
type Order={
  id:string;order_number:number;email:string;status:string;total_eur:number;shipping_name:string|null;
  shipping_address:any;notes:string|null;created_at:string;customers:Customer|null;order_items:OrderItem[]
};

const statusLabels:Record<string,string>={pending:'New',processing:'Processing',shipped:'Shipped',completed:'Completed',cancelled:'Cancelled'};

export default function AdminOrders(){
  const[ready,setReady]=useState(false);
  const[authorized,setAuthorized]=useState(false);
  const[orders,setOrders]=useState<Order[]>([]);
  const[msg,setMsg]=useState('');

  useEffect(()=>{init()},[]);

  async function init(){
    const{data:sessionData}=await supabase.auth.getSession();
    if(!sessionData.session){setReady(true);return}
    const{data:access}=await supabase.from('admin_users').select('user_id').limit(1);
    if(!access?.length){setReady(true);return}
    setAuthorized(true);
    await loadOrders();
    setReady(true);
  }

  async function loadOrders(){
    const{data,error}=await supabase.from('orders')
      .select('id,order_number,email,status,total_eur,shipping_name,shipping_address,notes,created_at,customers(first_name,last_name,phone),order_items(id,product_name,color_name,size_label,quantity,unit_price_eur,line_total_eur)')
      .order('created_at',{ascending:false});
    if(error){setMsg(error.message);return}
    setOrders((data??[]) as unknown as Order[]);
  }

  async function changeStatus(orderId:string,status:string){
    setMsg('');
    const{error}=await supabase.rpc('admin_update_order_status',{p_order_id:orderId,p_status:status});
    if(error){setMsg(error.message);return}
    await loadOrders();
    setMsg('Статусът е обновен.');
  }

  if(!ready)return <main className="adminshell"><div className="adminlogin">Зареждане...</div></main>;
  if(!authorized)return <main className="adminshell"><div className="adminlogin"><h1>Orders</h1><p>Нужен е администраторски вход.</p><Link className="btn primary" href="/admin">Към Admin</Link></div></main>;

  return <main className="adminshell">
    <header className="adminbar"><div><strong>SELIORA CMS</strong><span>Orders</span></div><div className="adminbarnav"><Link href="/admin">Products</Link><Link className="active" href="/admin/orders">Orders</Link></div></header>
    <section className="ordersadmin">
      <div className="adminheading"><div><div className="eyebrow">SELIORA</div><h1>Orders</h1></div><button className="btn" onClick={loadOrders}>Refresh</button></div>
      {msg&&<div className="adminmsg">{msg}</div>}
      {!orders.length?<div className="placeholder">Все още няма поръчки.</div>:
      <div className="ordercards">{orders.map(o=>{
        const a=o.shipping_address??{};
        return <article className="ordercard" key={o.id}>
          <div className="ordercardhead">
            <div><div className="eyebrow">{new Date(o.created_at).toLocaleString('bg-BG')}</div><h2>#{o.order_number}</h2></div>
            <div className="orderstatus"><select value={o.status} disabled={o.status==='completed'||o.status==='cancelled'} onChange={e=>changeStatus(o.id,e.target.value)}>
              <option value="pending">New</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select><strong>€{Number(o.total_eur).toFixed(2)}</strong></div>
          </div>
          <div className="ordercustomer">
            <div><span>Customer</span><strong>{o.shipping_name||[o.customers?.first_name,o.customers?.last_name].filter(Boolean).join(' ')||'—'}</strong><small>{o.email} · {o.customers?.phone||'—'}</small></div>
            <div><span>Delivery</span><strong>{a.city||'—'}, {a.country||'—'}</strong><small>{a.address||'—'} {a.postal_code||''}</small></div>
          </div>
          <div className="orderitems">{o.order_items.map(i=><div className="orderitem" key={i.id}><div><strong>{i.product_name}</strong><span>{i.color_name||'—'} · {i.size_label||'—'} · ×{i.quantity}</span></div><b>€{Number(i.line_total_eur).toFixed(2)}</b></div>)}</div>
          {o.notes&&<div className="ordernotes"><span>Note</span>{o.notes}</div>}
          <div className="orderfoot">Status: <strong>{statusLabels[o.status]??o.status}</strong></div>
        </article>
      })}</div>}
    </section>
  </main>
}
