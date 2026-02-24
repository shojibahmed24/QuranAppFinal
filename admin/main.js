const SUPABASE_URL = 'https://cuxazxzpvrodsmxktkne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eGF6eHpwdnJvZHNteGt0a25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTcxNzUsImV4cCI6MjA4NjgzMzE3NX0.8zGB_E_AAsU6wnBIBZnpQmDrmyKJXPLU11UChyZZKJ4';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentAdmin = null;
let activeTab = 'reminders';

async function initAdmin() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.replace('../app/index.html'); return; }
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
    if (!profile || !profile.is_admin) { alert('অ্যাডমিন অ্যাক্সেস নেই'); window.location.replace('../app/index.html'); return; }
    currentAdmin = profile;
    document.getElementById('admin-info').innerText = profile.full_name || profile.email;
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('admin-content').classList.remove('hidden');
    showTab(activeTab);
}

window.showTab = (tab) => {
    activeTab = tab;
    document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${tab}-section`).classList.remove('hidden');
    document.querySelectorAll('aside nav button').forEach(b => b.classList.remove('sidebar-active'));
    document.getElementById(`tab-${tab}`).classList.add('sidebar-active');
    
    const titles = { 'reminders': 'আজকের বার্তা', 'donors': 'রক্তদাতা ব্যবস্থাপনা', 'users': 'ব্যবহারকারী তালিকা' };
    document.getElementById('tab-title').innerText = titles[tab];

    if (tab === 'reminders') loadReminders();
    if (tab === 'donors') loadDonors();
    if (tab === 'users') loadUsers();
};

async function loadReminders() {
    const { data } = await supabaseClient.from('daily_reminders').select('*').order('created_at', { ascending: false });
    document.getElementById('reminders-list').innerHTML = data.map(r => `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50">
            <td class="p-4 text-sm text-slate-900 font-medium">${r.content}</td>
            <td class="p-4 text-xs text-slate-700 font-bold">${new Date(r.created_at).toLocaleDateString('bn-BD')}</td>
            <td class="p-4 text-center"><button onclick="deleteReminder(${r.id})" class="text-red-600 hover:text-red-800 transition-colors"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
}

window.addReminder = async () => {
    const content = document.getElementById('reminder-input').value.trim();
    if (!content) return;
    await supabaseClient.from('daily_reminders').insert([{ content, author: currentAdmin.full_name }]);
    document.getElementById('reminder-input').value = '';
    loadReminders();
};

window.deleteReminder = async (id) => {
    if (confirm('মুছে ফেলবেন?')) { await supabaseClient.from('daily_reminders').delete().eq('id', id); loadReminders(); }
};

async function loadDonors() {
    const { data } = await supabaseClient.from('blood_donors').select('*').order('created_at', { ascending: false });
    document.getElementById('donors-list').innerHTML = data.map(d => `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50">
            <td class="p-4 text-sm font-bold text-slate-900">${d.name}</td>
            <td class="p-4"><span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">${d.blood_group}</span></td>
            <td class="p-4 text-sm text-slate-800 font-medium">${d.location}</td>
            <td class="p-4 text-center"><button onclick="deleteDonor(${d.id})" class="text-red-600 hover:text-red-800 transition-colors"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
}

window.deleteDonor = async (id) => {
    if (confirm('মুছে ফেলবেন?')) { await supabaseClient.from('blood_donors').delete().eq('id', id); loadDonors(); }
};

async function loadUsers() {
    const { data } = await supabaseClient.from('profiles').select('*').order('updated_at', { ascending: false });
    document.getElementById('users-list').innerHTML = data.map(u => `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50">
            <td class="p-4 text-sm text-slate-900 font-bold">${u.full_name || 'N/A'}</td>
            <td class="p-4 text-sm text-slate-800 font-medium">${u.email}</td>
            <td class="p-4"><span class="px-2 py-1 rounded text-[10px] font-bold ${u.is_admin ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'}">${u.is_admin ? 'ADMIN' : 'USER'}</span></td>
        </tr>
    `).join('');
}

window.handleLogout = async () => { await supabaseClient.auth.signOut(); window.location.replace('../app/index.html'); };
document.addEventListener('DOMContentLoaded', initAdmin);