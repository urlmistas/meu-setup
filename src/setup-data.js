const build = [
  ['0','Fonte','Corsair RM750e 750 W',569.99,'CP-9020295-BR · versão 2025, ATX 3.1, cabo 12V-2x6 · primeira compra','Alta','2026-11-30','https://www.pichau.com.br/fonte-corsair-rm750e-750w-full-modular-atx-3-1-pcie-5-1-cybenetics-gold-preto-cp-9020295-br'],
  ['1','Gabinete','BRX Xtreme Glacier preto',179.99,'R41B · aquário Micro-ATX, 3 ventoinhas inclusas · conferir folga lateral do cabo da GPU antes de comprar','Alta','2026-12-31','https://www.terabyteshop.com.br/produto/39667/gabinete-gamer-brx-xtreme-glacier-mini-tower-lateral-e-frontal-de-vidro-com-3-fans-preto-r41b'],
  ['6','SSD','Crucial P3 Plus 1 TB',549.99,'CT1000P3PSSD8 · M.2 2280 NVMe PCIe 4.0','Média','2027-01-31','https://www.pichau.com.br/ssd-crucial-p3-plus-1tb-m-2-2280-pcie-nvme-leitura-5000mb-s-gravacao-3600mb-s-ct1000p3pssd8'],
  ['3','Processador','AMD Ryzen 5 7600 BOX',999.99,'100-100001015BOX · AM5, vídeo integrado e cooler incluso','Média','2027-02-28','https://www.pichau.com.br/processador-amd-ryzen-5-7600-6-core-12-threads-3-8ghz-5-1ghz-turbo-cache-38mb-am5-100-100001015box'],
  ['7','Cooler','AMD Wraith Stealth',0,'Incluso na caixa do Ryzen 5 7600 BOX · marcar como comprado junto com o processador','Média','2027-02-28',''],
  ['4','Placa-mãe','MSI PRO B650M-A WIFI',1499.99,'PRO-B650M-A-WIFI · B650, AM5, Micro-ATX, DDR5','Média','2027-03-31','https://www.pichau.com.br/placa-mae-msi-pro-b650m-a-wifi-ddr5-socket-am5-chipset-amd-b650-pro-b650m-a-wifi'],
  ['5','Memória','XPG Lancer RGB 32 GB DDR5-6000 CL36',970.94,'AX5U6000C3616G-DCLARWH · kit branco 2×16 GB, AMD EXPO · confirmar o Pix no carrinho','Média','2027-04-30','https://www.guerradigital.com.br/produtos/memoria-xpg-lancer-rgb-32gb-2x16gb-6000mhz-ddr5-cl36-ax5u6000c3616g-dclarwh/'],
  ['10','Monitor','LG UltraGear 24GS60F-B',943.67,'24GS60F-B · 24″, Full HD, IPS, 180 Hz, HDMI e DisplayPort','Baixa','2027-05-31','https://www.kabum.com.br/produto/614879/monitor-gamer-lg-ultragear-24-fhd-180hz-1ms-ips-dp-e-hdmi-hdr10-freesync-g-sync-24gs60f-b'],
  ['2','Placa de vídeo','INNO3D RTX 5070 Ti X3 OC 16 GB',7099.99,'N507T3-16D7X-176068N · 300 mm, 16 pinos · última compra, aguardar oferta','Baixa','','https://www.pichau.com.br/placa-de-video-inno3d-geforce-rtx-5070-ti-x3-oc-16gb-gddr7-256-bit-n507t3-16d7x-176068n']
].map(([id,category,name,price,details,priority,dueDate,url])=>({
  id,category,name,price,details,priority,dueDate,url,bought:false,researching:false,boughtDate:'',paidPrice:null
}))

const peripherals = [
  {id:'8',category:'Mouse',name:'KYSONA Jupiter X Ultra',details:'',price:null,bought:true,url:''},
  {id:'9',category:'Mousepad',name:'Titorion Gamer de Vidro Speed',details:'',price:null,bought:true,url:''}
]

const key='meu-setup-v1'
const nameKey=name=>name.trim().toLocaleLowerCase('pt-BR')

export function freshSetup() {
  return {parts:[...build,...peripherals],budget:5000,buildVersion:1}
}

export function loadSetup() {
  let saved
  try {
    saved=JSON.parse(localStorage.getItem(key))
  } catch {
    saved=null
  }
  if (!Array.isArray(saved?.parts)) {
    return freshSetup()
  }
  if (saved.buildVersion>=1) return saved

  const remaining=[...saved.parts]
  const updated=build.map(item=>{
    const matching=remaining.filter(part=>part.category===item.category)
    const exact=matching.find(part=>nameKey(part.name)===nameKey(item.name))
    const original=matching.find(part=>part.id===item.id)
    const existing=exact??original
    for (const match of new Set([exact,original])) {
      if (match) remaining.splice(remaining.indexOf(match),1)
    }
    if (existing) return {...existing,...item,id:existing.id}
    const id=remaining.some(part=>part.id===item.id)?`build-${item.id}`:item.id
    return {...item,id}
  })
  return {...saved,parts:[...updated,...remaining],buildVersion:1}
}

export function storeSetup(data) {
  localStorage.setItem(key,JSON.stringify(data))
}
