// Centralized location constants for Indian States and Union Territories

export const INDIAN_STATES = [
  // States (alphabetically ordered)
  { id: 'andhra-pradesh', name: 'Andhra Pradesh', type: 'state', lat: 15.9129, lng: 79.7400 },
  { id: 'arunachal-pradesh', name: 'Arunachal Pradesh', type: 'state', lat: 28.2180, lng: 94.7278 },
  { id: 'assam', name: 'Assam', type: 'state', lat: 26.2006, lng: 92.9376 },
  { id: 'bihar', name: 'Bihar', type: 'state', lat: 25.0961, lng: 85.3131 },
  { id: 'chhattisgarh', name: 'Chhattisgarh', type: 'state', lat: 21.2787, lng: 81.8661 },
  { id: 'goa', name: 'Goa', type: 'state', lat: 15.2993, lng: 74.1240 },
  { id: 'gujarat', name: 'Gujarat', type: 'state', lat: 22.2587, lng: 71.1924 },
  { id: 'haryana', name: 'Haryana', type: 'state', lat: 29.0588, lng: 76.0856 },
  { id: 'himachal-pradesh', name: 'Himachal Pradesh', type: 'state', lat: 31.1048, lng: 77.1734 },
  { id: 'jharkhand', name: 'Jharkhand', type: 'state', lat: 23.6102, lng: 85.2799 },
  { id: 'karnataka', name: 'Karnataka', type: 'state', lat: 15.3173, lng: 75.7139 },
  { id: 'kerala', name: 'Kerala', type: 'state', lat: 10.8505, lng: 76.2711 },
  { id: 'madhya-pradesh', name: 'Madhya Pradesh', type: 'state', lat: 22.9734, lng: 78.6569 },
  { id: 'maharashtra', name: 'Maharashtra', type: 'state', lat: 19.7515, lng: 75.7139 },
  { id: 'manipur', name: 'Manipur', type: 'state', lat: 24.6637, lng: 93.9063 },
  { id: 'meghalaya', name: 'Meghalaya', type: 'state', lat: 25.4670, lng: 91.3662 },
  { id: 'mizoram', name: 'Mizoram', type: 'state', lat: 23.1645, lng: 92.9376 },
  { id: 'nagaland', name: 'Nagaland', type: 'state', lat: 26.1584, lng: 94.5624 },
  { id: 'odisha', name: 'Odisha', type: 'state', lat: 20.9517, lng: 85.0985 },
  { id: 'punjab', name: 'Punjab', type: 'state', lat: 31.1471, lng: 75.3412 },
  { id: 'rajasthan', name: 'Rajasthan', type: 'state', lat: 27.0238, lng: 74.2179 },
  { id: 'sikkim', name: 'Sikkim', type: 'state', lat: 27.5330, lng: 88.5122 },
  { id: 'tamil-nadu', name: 'Tamil Nadu', type: 'state', lat: 11.1271, lng: 78.6569 },
  { id: 'telangana', name: 'Telangana', type: 'state', lat: 18.1124, lng: 79.0193 },
  { id: 'tripura', name: 'Tripura', type: 'state', lat: 23.9408, lng: 91.9882 },
  { id: 'uttar-pradesh', name: 'Uttar Pradesh', type: 'state', lat: 26.8467, lng: 80.9462 },
  { id: 'uttarakhand', name: 'Uttarakhand', type: 'state', lat: 30.0668, lng: 79.0193 },
  { id: 'west-bengal', name: 'West Bengal', type: 'state', lat: 22.9868, lng: 87.8550 },
  
  // Union Territories
  { id: 'andaman-nicobar', name: 'Andaman and Nicobar Islands', type: 'ut', lat: 11.7401, lng: 92.6586 },
  { id: 'chandigarh', name: 'Chandigarh', type: 'ut', lat: 30.7333, lng: 76.7794 },
  { id: 'dadra-nagar-haveli-daman-diu', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'ut', lat: 20.1809, lng: 73.0169 },
  { id: 'delhi', name: 'Delhi (NCT)', type: 'ut', lat: 28.7041, lng: 77.1025 },
  { id: 'jammu-kashmir', name: 'Jammu and Kashmir', type: 'ut', lat: 33.7782, lng: 76.5762 },
  { id: 'ladakh', name: 'Ladakh', type: 'ut', lat: 34.1526, lng: 77.5771 },
  { id: 'lakshadweep', name: 'Lakshadweep', type: 'ut', lat: 10.5667, lng: 72.6417 },
  { id: 'puducherry', name: 'Puducherry', type: 'ut', lat: 11.9416, lng: 79.8083 }
];

// Major cities by state (sample - can be expanded)
export const CITIES_BY_STATE = {
  'andhra-pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati'],
  'arunachal-pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  'assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur'],
  'bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'],
  'chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
  'goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
  'haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal'],
  'himachal-pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Kullu', 'Solan'],
  'jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
  'karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi'],
  'kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
  'madhya-pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
  'maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
  'manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur'],
  'meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin'],
  'mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
  'nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
  'odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Berhampur'],
  'punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda'],
  'rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan'],
  'tamil-nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  'telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar'],
  'tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar'],
  'uttar-pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut'],
  'uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Mussoorie'],
  'west-bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
  'andaman-nicobar': ['Port Blair', 'Diglipur', 'Rangat', 'Car Nicobar'],
  'chandigarh': ['Chandigarh'],
  'dadra-nagar-haveli-daman-diu': ['Daman', 'Diu', 'Silvassa'],
  'delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Connaught Place', 'Karol Bagh'],
  'jammu-kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  'ladakh': ['Leh', 'Kargil', 'Nubra', 'Zanskar'],
  'lakshadweep': ['Kavaratti', 'Agatti', 'Minicoy'],
  'puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam']
};

// Helper functions
export function getStateById(stateId) {
  return INDIAN_STATES.find(s => s.id === stateId);
}

export function getStateByName(stateName) {
  return INDIAN_STATES.find(s => s.name === stateName);
}

export function getCitiesByState(stateId) {
  return CITIES_BY_STATE[stateId] || [];
}

export function getAllStates() {
  return INDIAN_STATES.filter(s => s.type === 'state');
}

export function getAllUnionTerritories() {
  return INDIAN_STATES.filter(s => s.type === 'ut');
}

export function getAllLocations() {
  return INDIAN_STATES;
}

export function getLocationCoordinates(stateId, cityName = null) {
  const state = getStateById(stateId);
  if (!state) {
    return { lat: 20.5937, lng: 78.9629, zoom: 5 }; // India center
  }
  
  // If city is specified, you could add city-specific coordinates
  // For now, return state coordinates
  return {
    lat: state.lat,
    lng: state.lng,
    zoom: cityName ? 10 : 7
  };
}
