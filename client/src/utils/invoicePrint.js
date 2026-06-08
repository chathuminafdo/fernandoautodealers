import logoUrl from '../assests/aboutaaa.png';

const fmtNum = n => {
  if (n == null || n === '' || isNaN(n)) return null;
  return Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtRs  = n => n != null ? 'Rs. '  + fmtNum(n) : null;
const fmtLKR = n => n != null ? 'LKR '  + fmtNum(n) : null;

const fmtDate = d => {
  if (!d) return '—';
  const s = String(d).split('T')[0];
  const [y, m, dy] = s.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(dy)} ${months[parseInt(m) - 1]} ${y}`;
};

/* ── SVG FOOTER ICONS ─────────────────────────────────────────── */
const IC_PHONE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  stroke="#181818" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
  <rect x="6" y="2" width="12" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/>
</svg>`;
const IC_MAIL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  stroke="#181818" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3,7 12,13 21,7"/>
</svg>`;
const IC_PIN = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  stroke="#181818" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2 C 8 2,5 5,5 9 C 5 14,12 22,12 22 C 12 22,19 14,19 9 C 19 5,16 2,12 2 Z"/>
  <circle cx="12" cy="9" r="2.5"/>
</svg>`;

const CSS = `
  :root {
    --red:   #ed1c24;
    --ink:   #181818;
    --muted: #6b6b6b;
    --line:  #a8caea;
    --paper: #ffffff;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Mulish', system-ui, sans-serif;
    background: #e7e9ec;
    color: var(--ink);
    padding: 28px 16px;
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── PAGE ── */
  .invoice {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: var(--paper);
    padding: 16mm 18mm 14mm;
    box-shadow: 0 18px 48px rgba(0,0,0,.12);
    display: flex;
    flex-direction: column;
  }
  .inv-body { flex: 1; }

  /* ── HEADER ── */
  .header {
    text-align: center;
    margin-bottom: 32px;
  }
  .logo-img {
    width: 160px;
    height: auto;
    display: block;
    margin: 0 auto 14px;
  }
  .brand {
    text-align: center;
    font-weight: 900;
    font-size: 24px;
    color: var(--red);
    text-transform: uppercase;
    letter-spacing: 3px;
    line-height: 1.2;
  }

  /* ── TITLE ── */
  .title-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0 0 26px;
  }
  .title-mark { width: 32px; height: 28px; background: var(--red); flex-shrink: 0; }
  .title {
    font-size: 36px;
    font-weight: 900;
    letter-spacing: -1px;
    margin: 0;
    line-height: 1;
  }

  /* ── BUYER + DATE ROW ── */
  .top-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 24px;
    align-items: center;
    padding-bottom: 14px;
    border-bottom: 1.5px solid var(--line);
    margin-bottom: 14px;
  }
  .to-block .to-lbl  { font-weight: 900; font-size: 14px; line-height: 1.2; margin-bottom: 5px; }
  .buyer-name        { font-size: 22px; font-weight: 900; margin: 0 0 6px; line-height: 1.15; }
  .buyer-addr        { line-height: 1.6; font-weight: 500; font-size: 13.5px; color: var(--ink); }
  .date-block        { text-align: right; white-space: nowrap; }
  .date-block .dlbl  { font-weight: 900; }
  .date-block .dval  { margin-left: 10px; }

  /* ── SECTION LABEL ── */
  .section-label {
    font-weight: 900;
    font-size: 15px;
    padding-bottom: 10px;
    border-bottom: 1.5px solid var(--line);
    margin-bottom: 14px;
  }

  /* ── DESCRIPTION BLOCK ── */
  .desc {
    line-height: 1.75;
    font-weight: 500;
    font-size: 13.5px;
    color: var(--ink);
    padding-bottom: 16px;
    border-bottom: 1.5px solid var(--line);
    margin-bottom: 16px;
  }

  /* ── LEASE BLOCK ── */
  .lease-block {
    padding-bottom: 14px;
    border-bottom: 1.5px solid var(--line);
    margin-bottom: 16px;
    font-weight: 900;
    font-size: 14px;
    line-height: 1.75;
  }

  /* ── ADVANCED price style (text lines, left-aligned) ── */
  .adv-prices {
    padding-bottom: 14px;
    border-bottom: 1.5px solid var(--line);
    margin-bottom: 14px;
    font-weight: 900;
    font-size: 14px;
    line-height: 1.75;
  }
  .adv-prices.selling {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 14px;
  }

  /* ── PILL / TOTAL ── */
  .pill-wrap {
    display: flex;
    justify-content: flex-end;
    margin: 28px 0 84px;
  }
  .pill {
    display: inline-flex;
    align-items: stretch;
    font-weight: 900;
    font-size: 15px;
    min-width: 360px;
  }
  .pill-label {
    background: var(--red);
    color: #fff;
    padding: 13px 26px;
    display: flex;
    align-items: center;
    letter-spacing: 0.4px;
    white-space: nowrap;
  }
  .pill-value {
    background: #fff;
    color: var(--ink);
    border: 1.5px solid #d0d0d0;
    border-left: none;
    padding: 13px 26px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 1;
    letter-spacing: 0.3px;
  }

  /* ── SIGNATURES ── */
  .sig-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    margin: 0 0 26px;
  }
  .sig { text-align: center; }
  .sig .line {
    font-family: ui-monospace, Menlo, monospace;
    letter-spacing: 1px;
    margin-bottom: 8px;
    color: var(--ink);
    min-height: 18px;
    line-height: 1;
  }
  .sig .lbl { font-weight: 900; font-size: 16px; }

  /* ── FOOTER ── */
  .foot-rule { border-top: 1.5px solid var(--line); margin: 14px 0 16px; }
  .footer {
    display: grid;
    grid-template-columns: 1fr 1.3fr 1.4fr;
    gap: 20px;
    align-items: flex-start;
  }
  .fitem { display: flex; gap: 12px; align-items: flex-start; }
  .fitem .ic {
    width: 30px; height: 30px;
    border-radius: 4px;
    border: 1.5px solid #ccc;
    background: #fff;
    display: grid; place-items: center;
    flex-shrink: 0;
  }
  .fitem .flbl { font-weight: 900; font-size: 13.5px; margin-bottom: 2px; line-height: 1.2; }
  .fitem .fval { font-size: 12px; line-height: 1.5; font-weight: 500; }

  /* ── PRINT BUTTON ── */
  .pbar { text-align: center; padding: 13px 0 6px; background: #e7e9ec; }
  .pbtn {
    padding: 10px 32px; background: var(--red); color: #fff;
    border: none; border-radius: 6px; font-size: 14px; font-weight: 700;
    cursor: pointer; font-family: 'Mulish', sans-serif; letter-spacing: .4px;
  }
  .pbtn:hover { background: #c0151b; }

  @media print {
    html, body { margin: 0; padding: 0; background: white; }
    .pbar { display: none !important; }
    .invoice {
      box-shadow: none; margin: 0;
      width: 210mm; min-height: 297mm;
      padding: 14mm 18mm 12mm;
    }
    .header        { margin-bottom: 22px; }
    .top-row       { padding-bottom: 10px; margin-bottom: 10px; }
    .section-label { padding-bottom: 8px;  margin-bottom: 10px; }
    .desc          { padding-bottom: 10px; margin-bottom: 10px; }
    .lease-block   { padding-bottom: 8px;  margin-bottom: 10px; }
    .adv-prices    { padding-bottom: 8px;  margin-bottom: 8px;  }
    .pill-wrap     { margin: 20px 0 40px; }
    .sig-row       { margin: 0 0 16px; page-break-inside: avoid; break-inside: avoid; }
    .footer        { page-break-inside: avoid; break-inside: avoid; }
    .fitem         { page-break-inside: avoid; break-inside: avoid; }
    @page { size: A4; margin: 0; }
  }
`;

function buildHTML(type, { vehicle, sale, buyer }, logoSrc) {
  const isAdv = type === 'advance';
  const title = isAdv ? 'ADVANCED INVOICE' : 'INVOICE';
  const date  = isAdv ? (sale.advance_date || sale.sell_date) : sale.sell_date;

  const vehicleName = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ');

  // Description lines — exact Canva text format
  const descLines = [
    vehicleName,
    vehicle.chassis    ? `chassis number -[${vehicle.chassis}]`              : null,
    vehicle.engine_num ? `Engine number - [ ${vehicle.engine_num} ]`         : null,
    vehicle.model_code ? `Model - [${vehicle.model_code} ]`                  : null,
    vehicle.origin     ? `Country of origin - [ ${vehicle.origin} ]`         : null,
    vehicle.fuel_type  ? `Fuel Type- ${vehicle.fuel_type}`                   : null,
  ].filter(Boolean).join('<br>');

  const leaseF = fmtRs(sale.lease_amount);
  const cashF  = fmtRs(sale.cash_amount);
  const vpF    = fmtRs(sale.vehicle_price);
  const rmvF   = fmtRs(sale.rmv_fee);
  const sellF  = fmtRs(sale.sell_price);
  const advF   = fmtLKR(sale.advance_amount);
  const sellLKR = fmtLKR(sale.sell_price);

  const leaseBlock = (leaseF || cashF) ? `
    <div class="lease-block">
      ${leaseF ? `<div>Lease Amount: ${leaseF}</div>` : ''}
      ${cashF  ? `<div>Cash Amount: ${cashF}</div>`   : ''}
    </div>` : '';

  // Both invoice types use the same bold left-aligned text block (matching blank template)
  const priceBlock = `
    ${(vpF || rmvF) ? `
    <div class="adv-prices">
      ${vpF  ? `<div>Vehicle Price: ${vpF}</div>`  : ''}
      ${rmvF ? `<div>RMV Fee: ${rmvF}</div>`       : ''}
    </div>` : ''}
    ${sellF ? `<div class="adv-prices selling">Selling Price: ${sellF}</div>` : ''}
  `;

  const pillLabel  = isAdv ? 'ADVANCED'       : 'SELLING PRICE';
  const pillAmount = isAdv ? (advF || sellLKR) : sellLKR;

  const addrHTML = (buyer.buyer_address || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\n/g,'<br>');

  const logoTag = logoSrc
    ? `<img class="logo-img" src="${logoSrc}" alt="Fernando Auto Dealers">`
    : `<div style="font-weight:900;font-size:22px;color:#ed1c24;text-transform:uppercase">Fernando</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Fernando Auto Dealers</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
  <div class="pbar">
    <button class="pbtn" onclick="window.print()">&#128424;&nbsp; Print / Save as PDF</button>
  </div>

  <div class="invoice">
    <div class="inv-body">

      <!-- HEADER -->
      <div class="header">
        ${logoTag}
        <div class="brand">Fernando Auto Dealers</div>
      </div>

      <!-- TITLE -->
      <div class="title-wrap">
        <span class="title-mark"></span>
        <h1 class="title">${title}</h1>
      </div>

      <!-- BUYER + DATE -->
      <div class="top-row">
        <div class="to-block">
          <div class="to-lbl">To</div>
          <div class="buyer-name">${buyer.customer_name || '—'}</div>
          ${addrHTML ? `<div class="buyer-addr">${addrHTML}</div>` : ''}
        </div>
        <div class="date-block">
          <span class="dlbl">Date</span> :<span class="dval">${fmtDate(date)}</span>
        </div>
      </div>

      <!-- DESCRIPTION -->
      <div class="section-label">DESCRIPTION</div>
      <div class="desc">${descLines}</div>

      ${leaseBlock}
      ${priceBlock}

      <!-- PILL TOTAL -->
      <div class="pill-wrap">
        <div class="pill">
          <div class="pill-label">${pillLabel}</div>
          <div class="pill-value">${pillAmount}</div>
        </div>
      </div>

      <!-- SIGNATURES -->
      <div class="sig-row">
        <div class="sig">
          <div class="line">_______________</div>
          <div class="lbl">Signature of seller</div>
        </div>
        <div class="sig">
          <div class="line">_______________</div>
          <div class="lbl">Signature of buyer</div>
        </div>
      </div>

    </div><!-- /.inv-body -->

    <!-- FOOTER -->
    <div>
      <div class="foot-rule"></div>
      <div class="footer">
        <div class="fitem">
          <div class="ic">${IC_PHONE}</div>
          <div>
            <div class="flbl">Phone</div>
            <div class="fval">0784738223</div>
          </div>
        </div>
        <div class="fitem">
          <div class="ic">${IC_MAIL}</div>
          <div>
            <div class="flbl">Mail</div>
            <div class="fval">fernandoautodealers@gmail.com</div>
          </div>
        </div>
        <div class="fitem">
          <div class="ic">${IC_PIN}</div>
          <div>
            <div class="flbl">Address</div>
            <div class="fval">Fernando Auto Dealers<br>140/15 De Mel Road,<br>Lakshapathiya, Moratuwa</div>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /.invoice -->
</body>
</html>`;
}

function openInvoice(html) {
  const win = window.open('', '_blank', 'width=870,height=1200,scrollbars=yes,resizable=yes');
  if (!win) {
    alert('Popups are blocked. Please allow popups for this site to print invoices.');
    return;
  }
  win.document.write(html);
  win.document.close();
}

export function printAdvanceInvoice(data) {
  openInvoice(buildHTML('advance', data, logoUrl));
}

export function printCustomerInvoice(data) {
  openInvoice(buildHTML('full', data, logoUrl));
}
