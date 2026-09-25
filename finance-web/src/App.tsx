import { ScheduledTransactions } from './components/ScheduledTransactions';
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createSessionApi } from './services/api';
import { SessionContext } from './services/SessionContext';
import { PreferencesContext } from './services/PreferencesContext';
import type { Preferences } from './services/PreferencesContext';
import { AssetModal } from './components/AssetModal';
import type { Investment } from './components/AssetModal';
import { Profile } from './components/Profile';
import { TransactionModal } from './components/TransactionModal';
import { auth } from './services/firebase';
import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { Area as RechartsArea, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend as RechartsLegend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './App.css';
import './Sprint5.css';
import './Profile.css';

type Route='/'|'/dashboard'|'/investimentos'|'/perfil'|'/login'|'/cadastro'; type TType='INCOME'|'EXPENSE';
type Transaction={id:number;description:string;amount:number;type:TType;date:string;wallet?:string;specification?:string;responsible?:string|null;installmentNumber?:number;installmentCount?:number;installmentTotal?:number}; type Value={label:string;income:number;expense:number;total:number}; type Insights={monthly:Value[];categories:Value[];responsible:Value[];sources:Value[];daily:Value[]}; type Stats={balance:number;income:number;expense:number;savingsRate:number};
const privateRoutes:Route[]=['/','/dashboard','/investimentos','/perfil'], money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const sum=(items:Transaction[])=>items.reduce((a,x)=>a+Number(x.amount),0); const routeFromUrl=()=>{const p=location.pathname as Route;return [...privateRoutes,'/login','/cadastro'].includes(p)?p:'/'};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [ready, setReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [route, setRoute] = useState<Route>(routeFromUrl);
  const nav = (to: Route) => { if (location.pathname !== to) history.pushState({}, '', to); setRoute(to); };
  useEffect(() => { const h = () => setRoute(routeFromUrl()); addEventListener('popstate', h); return () => removeEventListener('popstate', h); }, []);
  useEffect(() => onAuthStateChanged(auth, next => { setUser(next); setReady(true); }), []);
  useEffect(() => { if (!ready || authBusy) return; if (!user && privateRoutes.includes(route)) nav('/login'); if (user && !privateRoutes.includes(route)) nav('/'); }, [ready, user, route, authBusy]);
  if (!ready) return <main className="loading-screen">Carregando sua conta…</main>;
  if (!user || authBusy) return <Auth route={route} nav={nav} onBusy={setAuthBusy}/>;
  return <Account key={user.uid} user={user} route={route} nav={nav}/>;
}

function Account({user, route, nav}: {user: FirebaseUser; route: Route; nav: (route: Route) => void}) {
  const [tx,setTx]=useState<Transaction[]>([]),[assets,setAssets]=useState<Investment[]>([]),[insights,setInsights]=useState<Insights|null>(null),[loading,setLoading]=useState(true),[txModal,setTxModal]=useState(false),[assetModal,setAssetModal]=useState<Investment|null|undefined>(undefined),[notice,setNotice]=useState('');
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [session, setSession] = useState<ReturnType<typeof createSessionApi> | null>(null);
  const [bootError, setBootError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const active = useRef(false);
  const request = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    const client = createSessionApi(user, controller.signal);
    active.current = true;
    setBootError(false);
    void client.post('/users', {name: user.displayName || user.email?.split('@')[0] || 'Usuário'})
      .then(() => client.get<Preferences>('/preferences')).then(response => { if (!controller.signal.aborted) { setPreferences(response.data); setSession(() => client); } })
      .catch(() => { if (!controller.signal.aborted) setBootError(true); });
    return () => { active.current = false; controller.abort(); };
  }, [user, attempt]);
  const api = session;
  const reload = async () => {
    if (!api || !active.current) return;
    const current = ++request.current;
    setLoading(true);
    try {
      const [a,b,c] = await Promise.all([api.get<Transaction[]>('/transactions'), api.get<Investment[]>('/investments'), api.get<Insights>('/insights/dashboard')]);
      if (!active.current || current !== request.current) return;
      setTx(a.data); setAssets(b.data); setInsights(c.data);
    } catch {
      if (active.current && current === request.current) setNotice('Não foi possível carregar seus dados agora.');
    } finally { if (active.current && current === request.current) setLoading(false); }
  };
  useEffect(() => { void reload(); }, [api]);
  const stats=useMemo(()=>{const current=monthTx(tx.filter(x=>x.date<=localDate()),0),income=sum(current.filter(x=>x.type==='INCOME')),expense=sum(current.filter(x=>x.type==='EXPENSE')),balance=tx.filter(x=>x.date<=localDate()).reduce((a,x)=>a+(x.type==='INCOME'?Number(x.amount):-Number(x.amount)),0);return{balance,income,expense,savingsRate:income?(income-expense)/income*100:expense?-100:0}},[tx]);
  if (bootError) return <main className="loading-screen"><div><p>Não foi possível preparar sua conta.</p><button onClick={() => setAttempt(x => x + 1)}>Tentar novamente</button><button onClick={() => void signOut(auth)}>Sair</button></div></main>;
  if (!api || !preferences) return <main className="loading-screen">Preparando sua conta…</main>;
return <SessionContext.Provider value={api}><PreferencesContext.Provider value={{values:preferences,update:setPreferences}}><div className="app-shell"><header className="topbar"><button className="brand" onClick={()=>nav('/')}>Easy<span>Money</span></button><nav><Nav active={route==='/'} onClick={()=>nav('/')}>Visão geral</Nav><Nav active={route==='/dashboard'} onClick={()=>nav('/dashboard')}>Dashboard</Nav><Nav active={route==='/investimentos'} onClick={()=>nav('/investimentos')}>Investimentos</Nav><Nav active={route==='/perfil'} onClick={()=>nav('/perfil')}>Perfil</Nav></nav><button className="logout" onClick={()=>void signOut(auth)}>Sair</button></header><main className="content">{notice&&<div className={`notice ${notice.startsWith('✓')?'notice-success':'notice-error'}`} role="status">{notice}<button aria-label="Fechar aviso" onClick={()=>setNotice('')}>×</button></div>}{route==='/'&&<Overview stats={stats} tx={tx} loading={loading} onNew={()=>setTxModal(true)}/>} {route==='/dashboard'&&<DashboardV2 stats={stats} tx={tx} assets={assets} insights={insights}/>} {route==='/investimentos'&&<Investments assets={assets} onEdit={setAssetModal}/>} {route==='/perfil'&&<Profile user={user}/>}</main><button className="fab" aria-label="Nova transação" onClick={()=>setTxModal(true)}>+</button>{txModal&&<TransactionModal close={()=>setTxModal(false)} done={async()=>{setTxModal(false);await reload();setNotice('✓ Transação salva com sucesso.')}}/>}{assetModal!==undefined&&<AssetModal asset={assetModal} close={()=>setAssetModal(undefined)} done={async()=>{setAssetModal(undefined);await reload();setNotice('✓ Investimento salvo com sucesso.')}}/>}</div></PreferencesContext.Provider></SessionContext.Provider>}
function Nav({active,onClick,children}:{active:boolean;onClick:()=>void;children:string}){return <button className={active?'nav-active':''} onClick={onClick}>{children}</button>} function Cards({stats}:{stats:Stats}){return <section className="summary-grid"><Card t="Saldo atual" v={stats.balance} c="Total acumulado" tone="balance"/><Card t="Receitas do mês" v={stats.income} c="No mês atual" tone="income"/><Card t="Despesas do mês" v={stats.expense} c="No mês atual" tone="expense"/><article className={`summary-card rate ${stats.savingsRate<0?'negative':''}`}><p>Taxa de poupança</p><strong>{stats.savingsRate.toFixed(0)}%</strong><span>{stats.savingsRate<0?'Despesas acima das receitas':'Meta saudável: acima de 20%'}</span></article></section>}function Card({t,v,c,tone}:{t:string;v:number;c:string;tone:string}){return <article className={`summary-card ${tone}`}><p>{t}</p><strong>{money.format(v)}</strong><span>{c}</span></article>}
function Overview({stats,tx,loading,onNew}:{stats:Stats;tx:Transaction[];loading:boolean;onNew:()=>void}){const scheduled=tx.filter(x=>x.date>localDate());const recent=tx.filter(x=>x.date<=localDate());return <><section className="page-heading"><div><p className="eyebrow">Visão geral</p><h1>Olá, organize seu mês.</h1><p>Acompanhe suas movimentações e mantenha o controle.</p></div><button className="primary-button" onClick={onNew}>+ Nova transação</button></section><Cards stats={stats}/><ScheduledTransactions items={scheduled}/><section className="panel"><div className="section-title"><div><h2>Transações recentes</h2><p>Suas últimas movimentações.</p></div><button className="text-button" onClick={onNew}>Adicionar</button></div>{loading?<Empty text="Carregando transações…"/>:recent.length?<div>{recent.slice(0,10).map(x=><TransactionRow key={x.id} x={x}/>)}</div>:<Empty text="Nenhuma transação ainda. Adicione a primeira para ver seu resumo."/>}</section></>};function TransactionRow({x}:{x:Transaction}){const inc=x.type==='INCOME';return <article className="transaction-row"><div className={`transaction-icon ${inc?'income-icon':'expense-icon'}`}>{inc?'↗':'↘'}</div><div className="transaction-info"><strong>{x.specification||x.description}</strong><span>{[x.wallet,x.responsible,x.installmentCount ? `Parcela ${x.installmentNumber}/${x.installmentCount}` : null,new Date(`${x.date}T12:00:00`).toLocaleDateString('pt-BR')].filter(Boolean).join(' · ')}</span></div><strong className={inc?'amount-income':'amount-expense'}>{inc?'+':'-'} {money.format(Number(x.amount))}</strong></article>}
function Investments({assets,onEdit}:{assets:Investment[];onEdit:(x:Investment|null)=>void}){const total=assets.reduce((a,x)=>a+Number(x.amount),0),groups=Object.entries(assets.reduce<Record<string,Investment[]>>((o,x)=>{(o[x.category]??=[]).push(x);return o},{}));return <section><div className="page-heading"><div><p className="eyebrow">Investimentos</p><h1>Seu patrimônio guardado</h1><p>Registre sua reserva, caixinhas e ativos para acompanhar o total.</p></div><button className="primary-button" onClick={()=>onEdit(null)}>+ Adicionar investimento</button></div><section className="investment-total"><span>Patrimônio investido</span><strong>{money.format(total)}</strong><p>{assets.length} posições cadastradas</p></section>{groups.length?<div className="investment-groups">{groups.map(([cat,list])=><section className="panel" key={cat}><h2>{cat}</h2>{list.map(x=><div className="investment-row" key={x.id}><div><strong>{x.name}</strong>{x.cdiPercent && <span>{x.cdiPercent}% CDI · estimativa bruta · saldo em {x.lastAccruedDate ? new Date(`${x.lastAccruedDate}T12:00:00`).toLocaleDateString('pt-BR') : 'aguardando'}</span>}{x.goal&&<span>Meta: {money.format(Number(x.goal))}</span>}</div><b>{money.format(Number(x.amount))}</b><button className="text-button" onClick={()=>onEdit(x)}>Editar</button></div>)}</section>)}</div>:<section className="panel empty-state">Sua primeira reserva pode começar por uma caixinha ou poupança.</section>}</section>}
function Auth({route,nav,onBusy}:{route:Route;nav:(x:Route)=>void;onBusy:(busy:boolean)=>void}){const registering=route==='/cadastro';const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);const submit=async(e:FormEvent)=>{e.preventDefault();try{setSaving(true);onBusy(true);const x=registering?await createUserWithEmailAndPassword(auth,email,password):await signInWithEmailAndPassword(auth,email,password);if(registering)await updateProfile(x.user,{displayName:name.trim()});nav('/')}catch{setError(registering?'Não foi possível criar a conta.':'E-mail ou senha inválidos.')}finally{setSaving(false);onBusy(false)}};const google=async()=>{try{setSaving(true);onBusy(true);await signInWithPopup(auth,new GoogleAuthProvider());nav('/')}catch{setError('Entre com sua senha e vincule o Google no Perfil, ou tente novamente.')}finally{setSaving(false);onBusy(false)}};return <main className="auth-page"><section className="auth-card"><div className="auth-brand">Easy<span>Money</span></div><p className="eyebrow">Sua vida financeira, em ordem</p><h1>{registering?'Crie sua conta':'Que bom ter você de volta'}</h1><p className="auth-description">{registering?'Comece a acompanhar seu dinheiro em poucos minutos.':'Entre para ver como estão suas finanças.'}</p><form onSubmit={submit}>{registering&&<label>Nome<input value={name} onChange={e=>setName(e.target.value)} required/></label>}<label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Senha<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<p className="form-error">{error}</p>}<button className="primary-button" disabled={saving}>{saving?'Aguarde…':registering?'Criar conta':'Entrar'}</button></form><div className="divider"><span>ou</span></div><button className="google-button" onClick={()=>void google()} disabled={saving}><b>G</b> Continuar com Google</button><p className="auth-switch">{registering?'Já possui uma conta?':'Ainda não tem uma conta?'} <button onClick={()=>nav(registering?'/login':'/cadastro')}>{registering?'Entrar':'Cadastre-se'}</button></p></section></main>}
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function monthTx(items:Transaction[],offset:number){const date=new Date();date.setDate(1);date.setMonth(date.getMonth()+offset);return items.filter(item=>{const itemDate=new Date(`${item.date}T12:00:00`);return itemDate.getMonth()===date.getMonth()&&itemDate.getFullYear()===date.getFullYear()})}
function Panel({title,sub,children}:{title:string;sub:string;children:ReactNode}){return <section className="panel chart-panel"><div className="section-title"><div><h2>{title}</h2><p>{sub}</p></div></div>{children}</section>}
function Empty({text='Adicione transações para visualizar esta análise.'}:{text?:string}){return <p className="empty-state">{text}</p>}

type DashboardView='overview'|'cashflow'|'goals';
type DashboardPeriod='1'|'3'|'6'|'12'|'all';
type DashboardKind='all'|TType;
type ExpenseGrouping='responsible'|'category';
type IncomeGrouping='responsible'|'wallet';

function DashboardV2({stats,tx,assets,insights}:{stats:Stats;tx:Transaction[];assets:Investment[];insights:Insights|null}){
  const [view,setView]=useState<DashboardView>('overview');
  const [period,setPeriod]=useState<DashboardPeriod>('6');
  const [kind,setKind]=useState<DashboardKind>('all');
  const [person,setPerson]=useState('all');
  const [category,setCategory]=useState('all');
  const [account,setAccount]=useState('all');
  const [expenseGrouping,setExpenseGrouping]=useState<ExpenseGrouping>('responsible');
  const [incomeGrouping,setIncomeGrouping]=useState<IncomeGrouping>('responsible');
  const people=useMemo(()=>[...new Set(tx.map(x=>x.responsible).filter((x):x is string=>Boolean(x)))].sort(),[tx]);
  const categories=useMemo(()=>[...new Set(tx.map(x=>x.specification||x.description).filter(Boolean))].sort(),[tx]);
  const accounts=useMemo(()=>[...new Set(tx.map(x=>x.wallet).filter((x):x is string=>Boolean(x)))].sort(),[tx]);
  const filtered=useMemo(()=>{
    const cutoff=new Date();
    if(period!=='all'){cutoff.setDate(1);cutoff.setHours(0,0,0,0);cutoff.setMonth(cutoff.getMonth()-Number(period)+1)}
    return tx.filter(x=>x.date<=localDate()&&(period==='all'||new Date(`${x.date}T12:00:00`)>=cutoff)&&(kind==='all'||x.type===kind)&&(person==='all'||x.responsible===person)&&(category==='all'||(x.specification||x.description)===category)&&(account==='all'||x.wallet===account));
  },[tx,period,kind,person,category,account]);
  const monthly=useMemo(()=>{
    const canUseInsights=period==='12'&&kind==='all'&&person==='all'&&category==='all'&&account==='all'&&insights?.monthly.length;
    if(!canUseInsights)return groupMonthly(filtered);
    let accumulated=0;
    return insights.monthly.map(x=>({...x,income:Number(x.income),expense:Number(x.expense),total:Number(x.total),displayLabel:new Date(`${x.label}-02T12:00:00`).toLocaleDateString('pt-BR',{month:'short'}),accumulated:accumulated+=Number(x.total)}));
  },[filtered,period,kind,person,category,account,insights]);
  const expenses=useMemo(()=>groupValues(filtered.filter(x=>x.type==='EXPENSE'),'specification'),[filtered]);
  const byResponsible=useMemo(()=>groupValues(filtered.filter(x=>x.type==='EXPENSE'),'responsible'),[filtered]);
  const incomeByResponsible=useMemo(()=>groupValues(filtered.filter(x=>x.type==='INCOME'),'responsible'),[filtered]);
  const incomeByWallet=useMemo(()=>groupValues(filtered.filter(x=>x.type==='INCOME'),'wallet'),[filtered]);
  const goalStats=useMemo(()=>{if(account==='all')return stats;const current=monthTx(tx.filter(x=>x.date<=localDate()),0).filter(x=>x.wallet===account),income=sum(current.filter(x=>x.type==='INCOME')),expense=sum(current.filter(x=>x.type==='EXPENSE'));return{...stats,income,expense,savingsRate:income?(income-expense)/income*100:expense?-100:0}},[account,stats,tx]);
  return <section className="dashboard-page">
    <div className="page-heading"><div><p className="eyebrow">Dashboard</p><h1>Seu dinheiro, do seu jeito</h1><p>Escolha uma análise e refine os dados sem sair da tela.</p></div></div>
    <Cards stats={stats}/>
    <div className="dashboard-toolbar" aria-label="Controles do dashboard">
      <div className="view-tabs" role="tablist" aria-label="Tipo de análise">
        <button className={view==='overview'?'active':''} onClick={()=>setView('overview')}>Visão geral</button>
        <button className={view==='cashflow'?'active':''} onClick={()=>setView('cashflow')}>Fluxo de caixa</button>
        <button className={view==='goals'?'active':''} onClick={()=>setView('goals')}>Metas</button>
      </div>
      <div className="dashboard-filters">
        <label>Período<select value={period} onChange={e=>setPeriod(e.target.value as DashboardPeriod)}><option value="1">Este mês</option><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option><option value="all">Todo o período</option></select></label>
        <label>Tipo<select value={kind} onChange={e=>setKind(e.target.value as DashboardKind)}><option value="all">Receitas e despesas</option><option value="INCOME">Somente receitas</option><option value="EXPENSE">Somente despesas</option></select></label>
        <label>Responsável<select value={person} onChange={e=>setPerson(e.target.value)}><option value="all">Todos</option>{people.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Categoria<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Todas</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Conta<select value={account} onChange={e=>setAccount(e.target.value)}><option value="all">Todas</option>{accounts.map(x=><option key={x}>{x}</option>)}</select></label>
      </div>
    </div>
    <p className="filter-result">{filtered.length} {filtered.length===1?'movimentação encontrada':'movimentações encontradas'}</p>
    {view==='overview'&&<div className="chart-grid dashboard-view"><Panel title="Evolução do saldo" sub="Resultado acumulado no período selecionado"><RechartsBalance values={monthly}/></Panel><Panel title="Despesas por categoria" sub="Distribuição dos gastos filtrados"><RechartsExpenses values={expenses}/></Panel></div>}
    {view==='cashflow'&&<div className="chart-grid dashboard-view cashflow-view"><Panel title="Receitas x despesas" sub="Comparativo mensal"><RechartsCashflow values={monthly}/></Panel><Panel title={expenseGrouping==='responsible'?'Despesas por responsável':'Despesas por categoria'} sub="Veja seus gastos pelo agrupamento que preferir"><div className="chart-switch" aria-label="Agrupamento das despesas"><button className={expenseGrouping==='responsible'?'active':''} onClick={()=>setExpenseGrouping('responsible')}>Responsável</button><button className={expenseGrouping==='category'?'active':''} onClick={()=>setExpenseGrouping('category')}>Categoria</button></div><RechartsResponsible values={expenseGrouping==='responsible'?byResponsible:expenses}/></Panel><Panel title={incomeGrouping==='responsible'?'Receitas por responsável':'Receitas por conta'} sub="Compare quem recebeu com a conta de entrada"><div className="chart-switch" aria-label="Agrupamento das receitas"><button className={incomeGrouping==='responsible'?'active':''} onClick={()=>setIncomeGrouping('responsible')}>Responsável</button><button className={incomeGrouping==='wallet'?'active':''} onClick={()=>setIncomeGrouping('wallet')}>Conta</button></div><RechartsResponsible values={incomeGrouping==='responsible'?incomeByResponsible:incomeByWallet} tone="income"/></Panel></div>}
    {view==='goals'&&<GoalsDashboard assets={assets} stats={goalStats}/>} 
  </section>
}

function groupMonthly(items:Transaction[]){
  const grouped=items.reduce<Record<string,Value>>((all,item)=>{const key=item.date.slice(0,7),value=Number(item.amount),row=all[key]??{label:key,income:0,expense:0,total:0};if(item.type==='INCOME')row.income+=value;else row.expense+=value;row.total=row.income-row.expense;all[key]=row;return all},{});
  let accumulated=0;
  return Object.values(grouped).sort((a,b)=>a.label.localeCompare(b.label)).map(x=>({...x,displayLabel:new Date(`${x.label}-02T12:00:00`).toLocaleDateString('pt-BR',{month:'short'}),accumulated:accumulated+=x.total}));
}

function groupValues(items:Transaction[],key:'responsible'|'specification'|'wallet'){
  const grouped=items.reduce<Record<string,number>>((all,item)=>{const label=item[key]||item.description||'Não informado';all[label]=(all[label]||0)+Number(item.amount);return all},{});
  return Object.entries(grouped).map(([label,total])=>({label,total})).sort((a,b)=>b.total-a.total);
}

const chartColors=['#d9363e','#f0754d','#8e2630','#f6b36b','#bd5260','#5d2530'];
const shortMoney=(value:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',style:'currency',currency:'BRL',maximumFractionDigits:1}).format(value);

function ChartEmpty(){return <Empty text="Nenhum dado corresponde aos filtros selecionados."/>}
function RechartsBalance({values}:{values:ReturnType<typeof groupMonthly>}){if(!values.length)return <ChartEmpty/>;return <div className="rechart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={values} margin={{top:12,right:8,left:0,bottom:0}}><defs><linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d9363e" stopOpacity={.32}/><stop offset="100%" stopColor="#d9363e" stopOpacity={.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee4e4"/><XAxis dataKey="displayLabel" tickLine={false} axisLine={false}/><YAxis tickFormatter={shortMoney} tickLine={false} axisLine={false} width={76}/><Tooltip formatter={value=>money.format(Number(value))}/><RechartsArea type="monotone" dataKey="accumulated" name="Saldo acumulado" stroke="#d9363e" strokeWidth={3} fill="url(#balanceGradient)"/></AreaChart></ResponsiveContainer></div>}
function RechartsExpenses({values}:{values:{label:string;total:number}[]}){if(!values.length)return <ChartEmpty/>;return <div className="rechart pie-layout"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={values.slice(0,7)} dataKey="total" nameKey="label" innerRadius="48%" outerRadius="76%" paddingAngle={2}>{values.slice(0,7).map((x,i)=><Cell key={x.label} fill={chartColors[i%chartColors.length]}/>)}</Pie><Tooltip formatter={value=>money.format(Number(value))}/><RechartsLegend verticalAlign="bottom" iconType="circle"/></PieChart></ResponsiveContainer></div>}
function RechartsCashflow({values}:{values:ReturnType<typeof groupMonthly>}){if(!values.length)return <ChartEmpty/>;return <div className="rechart"><ResponsiveContainer width="100%" height="100%"><BarChart data={values} margin={{top:12,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee4e4"/><XAxis dataKey="displayLabel" tickLine={false} axisLine={false}/><YAxis tickFormatter={shortMoney} tickLine={false} axisLine={false} width={76}/><Tooltip formatter={value=>money.format(Number(value))}/><RechartsLegend/><Bar dataKey="income" name="Receitas" fill="#9f2931" radius={[5,5,0,0]}/><Bar dataKey="expense" name="Despesas" fill="#f09a9f" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>}
function RechartsResponsible({values,tone='expense'}:{values:{label:string;total:number}[];tone?:'expense'|'income'}){if(!values.length)return <ChartEmpty/>;return <div className="rechart"><ResponsiveContainer width="100%" height="100%"><BarChart data={values.slice(0,8)} layout="vertical" margin={{top:8,right:16,left:12,bottom:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee4e4"/><XAxis type="number" tickFormatter={shortMoney} tickLine={false} axisLine={false}/><YAxis type="category" dataKey="label" width={82} tickLine={false} axisLine={false}/><Tooltip formatter={value=>money.format(Number(value))}/><Bar dataKey="total" name={tone==='income'?'Receitas':'Despesas'} fill={tone==='income'?'#9f2931':'#d9363e'} radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div>}

function GoalsDashboard({assets,stats}:{assets:Investment[];stats:Stats}){
  const withGoals=assets.filter(x=>Number(x.goal)>0);
  const invested=assets.reduce((total,x)=>total+Number(x.amount),0);
  const totalGoals=withGoals.reduce((total,x)=>total+Number(x.goal),0);
  const remaining=Math.max(0,totalGoals-invested);
  const monthlyPositive=Math.max(0,stats.income-stats.expense);
  const months=monthlyPositive>0?Math.ceil(remaining/monthlyPositive):null;
  const progress=totalGoals?invested/totalGoals*100:0;
  const visualProgress=Math.min(100,progress);
  return <div className="goals-layout"><section className="panel goal-hero"><div><p className="eyebrow">Patrimônio investido</p><strong>{money.format(invested)}</strong><span>{totalGoals?`${money.format(invested)} de ${money.format(totalGoals)} em metas`:`${assets.length} ${assets.length===1?'investimento':'investimentos'} sem meta global`}</span></div><div className="goal-ring" style={{'--progress':`${visualProgress*3.6}deg`} as React.CSSProperties}><span><b>{progress.toFixed(0)}%</b>das metas totais</span></div></section><section className="panel goal-summary"><div className="section-title"><div><h2>Ritmo para alcançar suas metas</h2><p>Todo o patrimônio comparado à soma de todas as metas.</p></div></div>{totalGoals?<><div className="goal-numbers"><div><span>Total investido</span><b>{money.format(invested)}</b></div><div><span>Total das metas</span><b>{money.format(totalGoals)}</b></div><div><span>Falta investir</span><b>{money.format(remaining)}</b></div><div><span>Saldo positivo do mês</span><b>{money.format(monthlyPositive)}</b></div></div><div className="goal-progress"><i style={{width:`${visualProgress}%`}}/></div><p className="goal-forecast">{remaining===0?'Seu patrimônio já alcançou ou superou a soma de todas as metas.':months?`Mantendo o saldo positivo atual, você pode alcançar o total das metas em cerca de ${months} ${months===1?'mês':'meses'}.`:'Seu mês ainda não tem saldo positivo. Reduza despesas ou aumente receitas para criar uma projeção.'}</p></>:<Empty text="Adicione uma meta em um investimento para comparar com todo o patrimônio."/>}</section><section className="panel goal-list"><div className="section-title"><div><h2>Progresso por investimento</h2><p>Valores individuais comparados às respectivas metas.</p></div></div>{withGoals.length?withGoals.map(x=>{const rawProgress=Number(x.amount)/Number(x.goal)*100,itemProgress=Math.min(100,rawProgress);return <div className="goal-item" key={x.id}><div><b>{x.name}</b><span>{money.format(Number(x.amount))} de {money.format(Number(x.goal))}</span></div><strong>{rawProgress.toFixed(0)}%</strong><i><b style={{width:`${itemProgress}%`}}/></i></div>}):<Empty text="Nenhum investimento possui meta definida."/>}</section></div>
}
