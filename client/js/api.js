const API_BASE = '/api';

// Fetch options wrapper with JWT injection
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  options.headers = {
    ...options.headers,
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle json payload
  if (options.body && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  // For multi-part file uploads (FormData), do not set Content-Type header manually (browser does it automatically)

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  
  if (res.status === 401) {
    // Session expired
    localStorage.clear();
    if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
      window.location.href = '/login.html';
    }
  }

  return res;
}

// Get user profile info
function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Set authenticated session details
function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Log out user
function logout() {
  localStorage.clear();
  window.location.href = '/login.html';
}

// Route Protection check
function checkAuth(allowedRoles = []) {
  const user = getUser();
  const token = localStorage.getItem('token');

  if (!token || !user) {
    window.location.href = '/login.html';
    return;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Send to default landing based on role
    window.location.href = `/${user.role}/dashboard.html`;
  }
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    updateThemeIcon(savedTheme, toggleBtn);
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon(newTheme, toggleBtn);
    });
  }
}

function updateThemeIcon(theme, btn) {
  if (theme === 'dark') {
    btn.innerHTML = '<i class="fas fa-sun"></i>';
    btn.title = "Switch to Light Mode";
  } else {
    btn.innerHTML = '<i class="fas fa-moon"></i>';
    btn.title = "Switch to Dark Mode";
  }
}

// Global Search
async function performSearch(query) {
  const res = await apiRequest(`/complaints?search=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.success ? data.data : [];
}

// Inject Dynamic Sidebar layout based on Role
function injectSidebar() {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;

  const user = getUser();
  if (!user) return;

  let menuItems = [];

  if (user.role === 'admin') {
    menuItems = [
      { label: 'Dashboard', icon: 'fas fa-th-large', link: '/admin/dashboard.html' },
      { label: 'Complaints Portal', icon: 'fas fa-folder-open', link: '/complaints.html' },
      { label: 'Petitions Feed', icon: 'fas fa-file-alt', link: '/petition.html' },
      { label: 'Discussion Groups', icon: 'fas fa-comments', link: '/groups.html' },
      { label: 'Profile Settings', icon: 'fas fa-user-cog', link: '/profile.html' }
    ];
  } else if (user.role === 'manager') {
    menuItems = [
      { label: 'Dashboard', icon: 'fas fa-th-large', link: '/manager/dashboard.html' },
      { label: 'Department Claims', icon: 'fas fa-folder-open', link: '/complaints.html' },
      { label: 'Profile Settings', icon: 'fas fa-user-cog', link: '/profile.html' }
    ];
  } else if (user.role === 'employee') {
    menuItems = [
      { label: 'Dashboard', icon: 'fas fa-th-large', link: '/employee/dashboard.html' },
      { label: 'My Assignments', icon: 'fas fa-tasks', link: '/complaints.html' },
      { label: 'Profile Settings', icon: 'fas fa-user-cog', link: '/profile.html' }
    ];
  } else if (user.role === 'citizen') {
    menuItems = [
      { label: 'Grievance Home', icon: 'fas fa-home', link: '/citizen/dashboard.html' },
      { label: 'File Grievance', icon: 'fas fa-plus-circle', link: '/complaints.html?action=raise' },
      { label: 'My Grievances', icon: 'fas fa-list-alt', link: '/complaints.html' },
      { label: 'Petitions Portal', icon: 'fas fa-file-signature', link: '/petition.html' },
      { label: 'Discussions Hub', icon: 'fas fa-users', link: '/groups.html' },
      { label: 'System Feedback', icon: 'fas fa-comment-dots', link: '/feedback.html' },
      { label: 'My Profile', icon: 'fas fa-user', link: '/profile.html' }
    ];
  } else if (user.role === 'ngo') {
    menuItems = [
      { label: 'NGO Dashboard', icon: 'fas fa-th-large', link: '/ngo/dashboard.html' },
      { label: 'Petitions Portal', icon: 'fas fa-file-signature', link: '/petition.html' },
      { label: 'Community Forum', icon: 'fas fa-users', link: '/groups.html' },
      { label: 'NGO Profile', icon: 'fas fa-user', link: '/profile.html' }
    ];
  }

  const activePath = window.location.pathname;

  let menuHTML = `
    <div class="sidebar-premium glass-panel" id="sidebar">
      <div class="sidebar-brand">
        <i class="fas fa-shield-alt"></i>
        <span>Grievance Hub</span>
      </div>
      <ul class="sidebar-menu">
  `;

  menuItems.forEach(item => {
    const isActive = activePath === item.link || (activePath === '/complaints.html' && item.link === '/complaints.html');
    menuHTML += `
      <li class="sidebar-item ${isActive ? 'active' : ''}">
        <a href="${item.link}">
          <i class="${item.icon}"></i>
          <span>${item.label}</span>
        </a>
      </li>
    `;
  });

  menuHTML += `
      </ul>
      <div class="sidebar-footer">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <img src="${user.profilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}" 
                 class="rounded-circle" width="32" height="32" style="object-fit: cover;">
            <div>
              <div style="font-size: 0.8rem; font-weight:700;">${user.name}</div>
              <div style="font-size: 0.65rem; color: var(--text-secondary); text-transform:uppercase;">${user.role}</div>
            </div>
          </div>
          <button class="btn btn-sm btn-link text-danger" onclick="logout()" title="Logout">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  sidebarContainer.innerHTML = menuHTML;
}

// In-app Alert Notifications builder
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) {
    const div = document.createElement('div');
    div.id = 'toast-container';
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.right = '20px';
    div.style.zIndex = '9999';
    document.body.appendChild(div);
  }
  
  const toast = document.createElement('div');
  toast.className = `glass-panel animated-fade-in text-white p-3 mb-2 d-flex align-items-center justify-content-between`;
  toast.style.background = type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
  toast.style.minWidth = '280px';
  toast.style.borderRadius = '8px';
  toast.innerHTML = `
    <span>${message}</span>
    <button class="btn-close btn-close-white ms-3" onclick="this.parentElement.remove()"></button>
  `;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// On document load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  injectSidebar();
});
