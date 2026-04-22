// Central time utility for IST timezone handling (CommonJS)

const getCurrentIST = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};

const getISTDate = (date) => {
  return new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const getISTDateOnly = (date) => {
  return new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const getISTTimeOnly = (date) => {
  return new Date(date).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const getTodayIST = () => {
  return new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const isTodayIST = (date) => {
  const dateIST = new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  return dateIST === getTodayIST();
};

module.exports = { getCurrentIST, getISTDate, getISTDateOnly, getISTTimeOnly, getTodayIST, isTodayIST };
