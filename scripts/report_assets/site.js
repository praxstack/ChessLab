'use strict';
const menu = document.querySelector('.menu-toggle');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  document.getElementById('chapter-nav').classList.toggle('open', open);
});
document.querySelector('.print-button')?.addEventListener('click', () => window.print());
const query = document.getElementById('document-search');
const category = document.getElementById('document-category');
function filterDocuments() {
  const text = query.value.toLocaleLowerCase().trim();
  let count = 0;
  for (const card of document.querySelectorAll('.document-card')) {
    const visible = (!text || card.dataset.search.includes(text)) && (!category.value || card.dataset.category === category.value);
    card.hidden = !visible;
    count += Number(visible);
  }
  document.getElementById('document-count').textContent = `${count} documents`;
  document.getElementById('no-documents').hidden = count > 0;
}
query?.addEventListener('input', filterDocuments);
category?.addEventListener('change', filterDocuments);
const exchangeText = {
  knight: 'Knight lost without a recapture: 3 points lost.',
  rook: 'Rook exchanged for bishop: 5 − 3 = 2 points lost.'
};
for (const button of document.querySelectorAll('[data-exchange]')) {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-exchange]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.getElementById('exchange-result').textContent = exchangeText[button.dataset.exchange];
  });
}
const conceptText = {
  inspect: ['Inspect the question', 'The learner has selected a confusing move. The original game is preserved while the explanation stays attached to this position.'],
  explore: ['Explore a different reply', 'An alternative belongs to this position. A question inside it stays in that branch; sibling lines remain available.'],
  return: ['Return to the actual game', 'The original node is selected again. The explored branch remains saved and can be reopened.']
};
for (const button of document.querySelectorAll('[data-concept]')) {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-concept]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    const state = button.dataset.concept;
    document.getElementById('concept-title').textContent = conceptText[state][0];
    document.getElementById('concept-description').textContent = conceptText[state][1];
    document.querySelectorAll('[data-branch]').forEach(b => b.classList.toggle('active', b.dataset.branch === state));
  });
}
const calculator = document.getElementById('economics');
function calculate() {
  const ids = ['payers', 'price', 'sessions', 'unit-cost', 'fee'];
  const values = ids.map(id => document.getElementById(id).valueAsNumber);
  const valid = values.every(Number.isFinite) && values.every(n => n >= 0) && values[4] <= 100 && Number.isInteger(values[0]) && Number.isInteger(values[2]);
  const error = document.getElementById('calc-error');
  if (!valid) {
    error.textContent = 'Enter non-negative values; subscribers and sessions must be whole numbers, and fees must be 0–100%.';
    ['revenue','variable-cost','contribution'].forEach(id => document.getElementById(id).textContent = '—');
    return;
  }
  error.textContent = '';
  const [payers,price,sessions,unitCost,fee] = values;
  const revenue = payers * price;
  const costs = payers * sessions * unitCost + revenue * fee / 100;
  const currency = document.getElementById('currency').value;
  const format = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {style:'currency',currency,maximumFractionDigits:2});
  document.getElementById('revenue').textContent = format.format(revenue);
  document.getElementById('variable-cost').textContent = format.format(costs);
  document.getElementById('contribution').textContent = format.format(revenue-costs);
}
calculator?.addEventListener('input', calculate);
calculator?.addEventListener('change', calculate);
if (calculator) calculate();
