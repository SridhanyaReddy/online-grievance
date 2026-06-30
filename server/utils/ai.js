const departmentsList = [
  'Roads', 'Water Supply', 'Drainage', 'Street Lights',
  'Garbage', 'Health', 'Education', 'Electricity',
  'Transport', 'Public Safety', 'Revenue', 'Others'
];

/**
 * Categorize description using basic keywords (Mock AI)
 * @param {string} description 
 */
const categorizeComplaint = (description = '') => {
  const text = description.toLowerCase();
  
  let department = 'Others';
  let category = 'General Request';
  let priority = 'medium';

  // Keyword check
  if (text.includes('pothole') || text.includes('road') || text.includes('street') || text.includes('tarmac')) {
    department = 'Roads';
    category = 'Road Repair';
    if (text.includes('accident') || text.includes('severe') || text.includes('broken')) {
      priority = 'high';
    }
  } else if (text.includes('water') || text.includes('leak') || text.includes('pipe') || text.includes('tap') || text.includes('contamination')) {
    department = 'Water Supply';
    category = 'Water Leakage / Shortage';
    if (text.includes('no water') || text.includes('dirty water')) {
      priority = 'high';
    }
  } else if (text.includes('drain') || text.includes('drainage') || text.includes('overflow') || text.includes('sewage')) {
    department = 'Drainage';
    category = 'Sewage Blockage';
    priority = 'high';
  } else if (text.includes('street light') || text.includes('light pole') || text.includes('darkness') || text.includes('bulb')) {
    department = 'Street Lights';
    category = 'Street Light Fault';
    priority = 'low';
  } else if (text.includes('garbage') || text.includes('trash') || text.includes('waste') || text.includes('dump') || text.includes('refuse')) {
    department = 'Garbage';
    category = 'Garbage Accumulation';
    priority = 'medium';
  } else if (text.includes('hospital') || text.includes('clinic') || text.includes('health') || text.includes('disease') || text.includes('medical') || text.includes('epidemic')) {
    department = 'Health';
    category = 'Sanitation & Health';
    priority = 'high';
  } else if (text.includes('school') || text.includes('college') || text.includes('education') || text.includes('teacher') || text.includes('student')) {
    department = 'Education';
    category = 'Educational Facilities';
    priority = 'medium';
  } else if (text.includes('electricity') || text.includes('power') || text.includes('blackout') || text.includes('transformer') || text.includes('current')) {
    department = 'Electricity';
    category = 'Power Interruption';
    priority = 'critical';
  } else if (text.includes('bus') || text.includes('train') || text.includes('transport') || text.includes('traffic') || text.includes('commute')) {
    department = 'Transport';
    category = 'Public Transport Issue';
    priority = 'medium';
  } else if (text.includes('police') || text.includes('safety') || text.includes('crime') || text.includes('robbery') || text.includes('threat') || text.includes('theft') || text.includes('harassment')) {
    department = 'Public Safety';
    category = 'Law Enforcement / Security';
    priority = 'critical';
  } else if (text.includes('tax') || text.includes('revenue') || text.includes('property') || text.includes('payment') || text.includes('stamp')) {
    department = 'Revenue';
    category = 'Tax and Payment Queries';
    priority = 'low';
  }

  // Critical escalation check
  if (text.includes('dangerous') || text.includes('injury') || text.includes('hazard') || text.includes('emergency') || text.includes('risk')) {
    priority = 'critical';
  }

  return { department, category, priority };
};

module.exports = { categorizeComplaint };
