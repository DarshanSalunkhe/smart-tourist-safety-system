// Simple phone input with country code selector
export function createPhoneInput(inputId, defaultCountry = 'in') {
  const countries = [
    { code: 'in', name: 'India', dial: '+91', flag: '🇮🇳' },
    { code: 'us', name: 'USA', dial: '+1', flag: '🇺🇸' },
    { code: 'gb', name: 'UK', dial: '+44', flag: '🇬🇧' },
    { code: 'ae', name: 'UAE', dial: '+971', flag: '🇦🇪' },
    { code: 'au', name: 'Australia', dial: '+61', flag: '🇦🇺' },
    { code: 'ca', name: 'Canada', dial: '+1', flag: '🇨🇦' },
    { code: 'sg', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
    { code: 'my', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
    { code: 'th', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
    { code: 'jp', name: 'Japan', dial: '+81', flag: '🇯🇵' },
    { code: 'cn', name: 'China', dial: '+86', flag: '🇨🇳' },
    { code: 'kr', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
    { code: 'de', name: 'Germany', dial: '+49', flag: '🇩🇪' },
    { code: 'fr', name: 'France', dial: '+33', flag: '🇫🇷' },
    { code: 'es', name: 'Spain', dial: '+34', flag: '🇪🇸' },
    { code: 'it', name: 'Italy', dial: '+39', flag: '🇮🇹' },
    { code: 'br', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
    { code: 'mx', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
    { code: 'za', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
    { code: 'eg', name: 'Egypt', dial: '+20', flag: '🇪🇬' }
  ];

  const defaultCtry = countries.find(c => c.code === defaultCountry) || countries[0];

  const html = `
    <div class="phone-input-wrapper" style="display: flex; gap: 0.5rem;">
      <select class="form-control phone-country-select" style="flex: 0 0 120px; font-size: 0.9rem;">
        ${countries.map(c => `
          <option value="${c.dial}" ${c.code === defaultCountry ? 'selected' : ''}>
            ${c.flag} ${c.dial}
          </option>
        `).join('')}
      </select>
      <input 
        type="tel" 
        id="${inputId}" 
        class="form-control phone-number-input" 
        placeholder="XXXXXXXXXX" 
        style="flex: 1;"
        required
      />
    </div>
  `;

  return {
    html,
    getValue: () => {
      const select = document.querySelector(`#${inputId}`).previousElementSibling;
      const input = document.getElementById(inputId);
      return select.value + input.value.replace(/^0+/, ''); // Remove leading zeros
    },
    setValue: (fullNumber) => {
      // Parse existing number like "+91-1234567890"
      const match = fullNumber.match(/^(\+\d+)[-\s]?(.+)$/);
      if (match) {
        const [, code, number] = match;
        const select = document.querySelector(`#${inputId}`).previousElementSibling;
        const input = document.getElementById(inputId);
        select.value = code;
        input.value = number;
      }
    }
  };
}
