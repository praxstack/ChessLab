const search = document.querySelector('#search');
if (search) search.addEventListener('input', () => {
  const query = search.value.trim().toLowerCase();
  document.querySelectorAll('.card').forEach(card => { card.hidden = !card.dataset.search.toLowerCase().includes(query); });
  document.querySelectorAll('.phase').forEach(section => { section.hidden = !section.querySelector('.card:not([hidden])'); });
  document.querySelector('#empty').hidden = !!document.querySelector('.card:not([hidden])');
});
