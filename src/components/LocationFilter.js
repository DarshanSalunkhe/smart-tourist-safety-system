// Location Filter Component
import { locationDataService } from '../services/location-data.js';
import { i18n } from '../services/i18n.js';

export function createLocationFilter(options = {}) {
  const {
    onStateChange = () => {},
    onCityChange = () => {},
    showLabel = true,
    inline = false,
    selectedState = 'all',
    selectedCity = 'all'
  } = options;

  const states = locationDataService.getStates();
  const cities = locationDataService.getCities(selectedState);

  const containerStyle = inline
    ? 'display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;'
    : 'display: grid; gap: 1rem; margin-bottom: 1rem;';

  return `
    <div class="location-filter" style="${containerStyle}">
      ${showLabel ? `<div style="font-weight: 600; margin-bottom: 0.5rem;">📍 ${i18n.t('filter_location')}:</div>` : ''}

      <div style="flex: 1; min-width: 200px;">
        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem; color: var(--text-light);">${i18n.t('state_label')}</label>
        <select id="stateFilter" class="form-control" style="width: 100%;">
          ${states.map(state => `
            <option value="${state.id}" ${state.id === selectedState ? 'selected' : ''}>
              ${state.name}
            </option>
          `).join('')}
        </select>
      </div>

      <div style="flex: 1; min-width: 200px;">
        <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem; color: var(--text-light);">${i18n.t('city_label')}</label>
        <select id="cityFilter" class="form-control" style="width: 100%;">
          ${cities.map(city => `
            <option value="${city.id}" ${city.id === selectedCity ? 'selected' : ''}>
              ${city.name}
            </option>
          `).join('')}
        </select>
      </div>
    </div>
  `;
}

export function setupLocationFilterHandlers(onStateChange, onCityChange) {
  const stateFilter = document.getElementById('stateFilter');
  const cityFilter  = document.getElementById('cityFilter');

  if (!stateFilter || !cityFilter) {
    console.warn('[LocationFilter] stateFilter or cityFilter not found in DOM');
    return;
  }

  stateFilter.addEventListener('change', (e) => {
    const stateId = e.target.value;
    const cities  = locationDataService.getCities(stateId);

    cityFilter.innerHTML = '';
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city.id;
      option.textContent = city.name;
      cityFilter.appendChild(option);
    });
    cityFilter.value = 'all';

    onStateChange(stateId, 'all');
    locationDataService.setCurrentLocation(stateId, 'all');
  });

  cityFilter.addEventListener('change', (e) => {
    const cityId  = e.target.value;
    const stateId = stateFilter.value;
    onCityChange(stateId, cityId);
    locationDataService.setCurrentLocation(stateId, cityId);
  });
}
