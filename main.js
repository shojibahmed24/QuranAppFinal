const SUPABASE_URL = 'https://cuxazxzpvrodsmxktkne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eGF6eHpwdnJvZHNteGt0a25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTcxNzUsImV4cCI6MjA4NjgzMzE3NX0.8zGB_E_AAsU6wnBIBZnpQmDrmyKJXPLU11UChyZZKJ4';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let userProfile = null;
let authMode = 'login';
let allSurahs = [];
let userLocation = { lat: 23.8103, lng: 90.4125 };
let ramadanTimings = { sehri: '', iftar: '' };
let currentAudio = new Audio();
let currentAyahList = [];
let currentAyahIndex = -1;

const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
const safeSetStyle = (id, prop, val) => { const el = document.getElementById(id); if (el) el.style[prop] = val; };

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    checkUser();
    initLocation();
    loadSurahs();
    loadDailyReminder();
    setInterval(updateMealCountdown, 1000);
    initQibla();

    currentAudio.ontimeupdate = () => {
        if (currentAudio.duration) {
            const progress = (currentAudio.currentTime / currentAudio.duration);
            const circle = document.getElementById('audio-progress-circle');
            if (circle) circle.style.strokeDashoffset = 157 - (progress * 157);
        }
    };
    currentAudio.onended = () => playNextAyah();
});

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        currentUser = user;
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
            userProfile = profile;
            document.getElementById('login-btn')?.classList.add('hidden');
            document.getElementById('user-info')?.classList.remove('hidden');
            safeSetText('user-name', userProfile.full_name || user.email.split('@')[0]);
            
            // Show Admin Link if user is admin
            if (userProfile.is_admin) {
                document.getElementById('admin-link')?.classList.remove('hidden');
            }
            
            initTracker();
        }
    } else {
        document.getElementById('login-btn')?.classList.remove('hidden');
        document.getElementById('user-info')?.classList.add('hidden');
        document.getElementById('admin-link')?.classList.add('hidden');
    }
}

async function loadDailyReminder() {
    try {
        const { data } = await supabaseClient.from('daily_reminders').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single();
        if (data) {
            const container = document.getElementById('daily-reminder-container');
            if (container) {
                container.classList.remove('hidden');
                safeSetText('reminder-text', data.content);
            }
        }
    } catch (e) {}
}

window.handleLogout = async () => {
    await supabaseClient.auth.signOut();
    showToast('লগআউট সফল হয়েছে');
    setTimeout(() => location.reload(), 1000);
};

window.toggleAuthMode = (mode) => {
    authMode = mode;
    const signupFields = document.getElementById('signup-fields');
    const submitBtn = document.getElementById('auth-submit-btn');
    const loginTab = document.getElementById('auth-tab-login');
    const signupTab = document.getElementById('auth-tab-signup');

    if (mode === 'signup') {
        signupFields?.classList.remove('hidden');
        if (submitBtn) submitBtn.innerText = 'রেজিস্ট্রেশন করুন';
        if (signupTab) signupTab.className = 'text-sm font-bold text-emerald-800 border-b-2 border-emerald-800 pb-1';
        if (loginTab) loginTab.className = 'text-sm font-bold text-slate-400 pb-1';
    } else {
        signupFields?.classList.add('hidden');
        if (submitBtn) submitBtn.innerText = 'প্রবেশ করুন';
        if (loginTab) loginTab.className = 'text-sm font-bold text-emerald-800 border-b-2 border-emerald-800 pb-1';
        if (signupTab) signupTab.className = 'text-sm font-bold text-slate-400 pb-1';
    }
};

window.openAuthModal = () => document.getElementById('auth-modal')?.classList.add('active');
window.closeAuthModal = () => document.getElementById('auth-modal')?.classList.remove('active');

window.handleAuth = async () => {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    const name = document.getElementById('auth-name')?.value;
    const btn = document.getElementById('auth-submit-btn');

    if (!email || !password) return showToast('সব তথ্য দিন');
    
    btn.disabled = true;
    btn.innerText = 'অপেক্ষা করুন...';

    try {
        if (authMode === 'signup') {
            if (!name) throw new Error('আপনার নাম দিন');
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            if (data.user) {
                await supabaseClient.from('profiles').update({ full_name: name }).eq('id', data.user.id);
                showToast('রেজিস্ট্রেশন সফল!');
                location.reload();
            }
        } else {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showToast('লগইন সফল!');
            location.reload();
        }
    } catch (e) {
        showToast(e.message);
        btn.disabled = false;
        btn.innerText = authMode === 'signup' ? 'রেজিস্ট্রেশন করুন' : 'প্রবেশ করুন';
    }
};

window.showSection = function(sectionId) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${sectionId}-section`)?.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));
    document.getElementById(`nav-${sectionId}`)?.classList.add('nav-active');
    if (sectionId === 'blood') loadDonors();
    if (sectionId === 'tracker') initTracker();
    document.querySelector('main').scrollTop = 0;
};

async function initLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            fetchPrayerTimes();
            initQibla();
        }, () => fetchPrayerTimes());
    } else fetchPrayerTimes();
}

async function fetchPrayerTimes() {
    try {
        const date = new Date().toISOString().split('T')[0];
        const res = await fetch(`https://api.aladhan.com/v1/timings/${date}?latitude=${userLocation.lat}&longitude=${userLocation.lng}&method=2`);
        const data = await res.json();
        const timings = data.data.timings;
        ramadanTimings.sehri = timings.Imsak;
        ramadanTimings.iftar = timings.Maghrib;
        safeSetText('sehri-time', timings.Imsak);
        safeSetText('iftar-time', timings.Maghrib);
        safeSetText('ramadan-date', data.data.date.hijri.day + ' ' + data.data.date.hijri.month.en + ' ' + data.data.date.hijri.year);
    } catch (e) { console.error(e); }
}

function updateMealCountdown() {
    if (!ramadanTimings.sehri || !ramadanTimings.iftar) return;
    const now = new Date();
    const [sH, sM] = ramadanTimings.sehri.split(':');
    const [iH, iM] = ramadanTimings.iftar.split(':');
    const sehriTime = new Date(); sehriTime.setHours(sH, sM, 0);
    const iftarTime = new Date(); iftarTime.setHours(iH, iM, 0);
    let target, label, progress = 0;
    if (now < sehriTime) { target = sehriTime; label = 'সেহরির বাকি'; }
    else if (now < iftarTime) { target = iftarTime; label = 'ইফতারের বাকি'; progress = ((now - sehriTime) / (iftarTime - sehriTime)) * 100; }
    else { target = new Date(sehriTime.getTime() + 24 * 60 * 60 * 1000); label = 'আগামী সেহরির বাকি'; }
    const diff = target - now;
    const hh = Math.floor(diff/3600000), mm = Math.floor((diff%3600000)/60000), ss = Math.floor((diff%60000)/1000);
    
    safeSetText('next-meal-label', label);
    safeSetText('meal-countdown', `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`);
    safeSetStyle('fasting-progress', 'width', `${progress}%`);
}

async function loadSurahs() {
    const list = document.getElementById('surah-list');
    if (list) list.innerHTML = '<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>';
    try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await res.json();
        allSurahs = data.data;
        renderSurahs(allSurahs);
    } catch (e) { 
        if (list) list.innerHTML = '<p class="text-center text-slate-400 py-10">কুরআন লোড করা সম্ভব হয়নি।</p>';
    }
}

function renderSurahs(surahs) {
    const list = document.getElementById('surah-list');
    if (!list) return;
    list.innerHTML = surahs.map(s => `
        <div onclick="loadAyahs(${s.number}, '${s.englishName}')" class="glass-card surah-card p-4 flex justify-between items-center cursor-pointer gap-3">
            <div class="flex items-center gap-4 min-w-0">
                <div class="w-10 h-10 flex-shrink-0 premium-gradient text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md">${s.number}</div>
                <div class="truncate"><p class="font-bold text-slate-900 text-sm truncate">${s.englishName}</p><p class="text-[10px] text-emerald-600 font-bold uppercase">${s.numberOfAyahs} Ayahs</p></div>
            </div>
            <p class="arabic-text text-xl text-emerald-800 flex-shrink-0 font-bold">${s.name}</p>
        </div>
    `).join('');
}

window.filterSurahs = function() {
    const q = document.getElementById('quran-search')?.value.toLowerCase() || '';
    const filtered = allSurahs.filter(s => s.englishName.toLowerCase().includes(q) || s.name.includes(q));
    renderSurahs(filtered);
};

window.loadAyahs = async function(num, name) {
    document.getElementById('surah-list')?.classList.add('hidden');
    document.getElementById('quran-search-container')?.classList.add('hidden');
    document.getElementById('ayah-view')?.classList.remove('hidden');
    const container = document.getElementById('ayah-container');
    if (container) container.innerHTML = '<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>';
    try {
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/editions/quran-uthmani,bn.bengali`);
        const data = await res.json();
        const uthmani = data.data[0].ayahs, bengali = data.data[1].ayahs;
        currentAyahList = uthmani.map((a, i) => ({ number: a.number, surahName: name, index: i }));
        if (container) container.innerHTML = uthmani.map((a, i) => `
            <div id="ayah-card-${i}" class="ayah-card glass-card p-5 space-y-4 transition-all duration-300">
                <div class="flex justify-between items-center"><span class="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">${num}:${i+1}</span><button onclick="playAyah(${i})" class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-sm active:scale-90"><i class="fas fa-play text-[10px]"></i></button></div>
                <p class="arabic-text text-xl text-right leading-[2.1] text-slate-900 font-bold">${a.text}</p>
                <div class="border-t border-slate-50 pt-3"><p class="text-[13px] text-slate-600 leading-relaxed font-medium">${bengali[i].text}</p></div>
            </div>
        `).join('');
        document.querySelector('main').scrollTop = 0;
    } catch (e) { 
        showToast('আয়াত লোড করা সম্ভব হয়নি');
    }
};

window.backToSurahList = function() {
    document.getElementById('surah-list')?.classList.remove('hidden');
    document.getElementById('quran-search-container')?.classList.remove('hidden');
    document.getElementById('ayah-view')?.classList.add('hidden');
    document.getElementById('global-audio-player')?.classList.add('hidden');
    currentAudio.pause();
};

window.playAyah = function(index) {
    currentAyahIndex = index;
    const ayah = currentAyahList[index];
    document.querySelectorAll('.ayah-card').forEach(c => c.classList.remove('active-ayah'));
    const activeCard = document.getElementById(`ayah-card-${index}`);
    if (activeCard) { activeCard.classList.add('active-ayah'); activeCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    currentAudio.src = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayah.number}.mp3`;
    currentAudio.play();
    document.getElementById('global-audio-player')?.classList.remove('hidden');
    const playBtn = document.getElementById('main-play-pause');
    if (playBtn) playBtn.className = 'fas fa-pause text-sm';
};

window.toggleAudio = function() {
    const playBtn = document.getElementById('main-play-pause');
    if (currentAudio.paused) { currentAudio.play(); if (playBtn) playBtn.className = 'fas fa-pause text-sm'; } 
    else { currentAudio.pause(); if (playBtn) playBtn.className = 'fas fa-play text-sm'; }
};

function playNextAyah() {
    if (currentAyahIndex + 1 < currentAyahList.length) playAyah(currentAyahIndex + 1);
}

async function initTracker() {
    const tasks = [{ id: 'Fajr', name: 'ফজর' }, { id: 'Dhuhr', name: 'যোহর' }, { id: 'Asr', name: 'আসর' }, { id: 'Maghrib', name: 'মাগরিব' }, { id: 'Isha', name: 'এশা' }];
    let completedPrayers = [];
    if (currentUser) {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabaseClient.from('prayer_logs').select('prayer_name').eq('user_id', currentUser.id).eq('date', today);
        if (data) completedPrayers = data.map(d => d.prayer_name);
        updateMonthlyStats();
        document.getElementById('monthly-stats-card')?.classList.remove('hidden');
    }
    const list = document.getElementById('tracker-list');
    if (list) {
        list.innerHTML = tasks.map(t => `
            <div class="glass-card p-5 flex justify-between items-center ${completedPrayers.includes(t.id) ? 'bg-emerald-50/50' : ''}" onclick="handleTrackerClick('${t.id}', ${completedPrayers.includes(t.id)})">
                <span class="font-bold text-slate-900 text-sm">${t.name} নামাজ</span>
                <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${completedPrayers.includes(t.id) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-200'}">
                    ${completedPrayers.includes(t.id) ? '<i class="fas fa-check text-white text-[10px]"></i>' : ''}
                </div>
            </div>
        `).join('');
    }
}

window.handleTrackerClick = function(id, isChecked) {
    if (!currentUser) { showToast('নামাজ ট্র্যাক করতে লগইন করুন'); openAuthModal(); return; }
    togglePrayer(id, !isChecked);
};

window.togglePrayer = async function(prayerName, isChecked) {
    if (!currentUser) return;
    try {
        const today = new Date().toISOString().split('T')[0];
        if (isChecked) await supabaseClient.from('prayer_logs').insert({ user_id: currentUser.id, prayer_name: prayerName, date: today });
        else await supabaseClient.from('prayer_logs').delete().eq('user_id', currentUser.id).eq('prayer_name', prayerName).eq('date', today);
        initTracker();
        showToast(isChecked ? 'নামাজ সম্পন্ন হয়েছে' : 'নামাজ বাতিল করা হয়েছে');
    } catch (e) { showToast('ত্রুটি হয়েছে'); }
};

async function updateMonthlyStats() {
    if (!currentUser) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const daysPassed = now.getDate();
    const { data: monthlyData } = await supabaseClient.from('prayer_logs').select('prayer_name').eq('user_id', currentUser.id).gte('date', startOfMonth);
    if (!monthlyData) return;
    const prayerCounts = { 'Fajr': 0, 'Dhuhr': 0, 'Asr': 0, 'Maghrib': 0, 'Isha': 0 };
    monthlyData.forEach(log => { if (prayerCounts[log.prayer_name] !== undefined) prayerCounts[log.prayer_name]++; });
    const totalExpected = daysPassed * 5, totalPerformed = monthlyData.length, totalMissed = totalExpected - totalPerformed;
    let mostMissedName = '--', maxMissedCount = -1;
    const bnNames = { 'Fajr': 'ফজর', 'Dhuhr': 'যোহর', 'Asr': 'আসর', 'Maghrib': 'মাগরিব', 'Isha': 'এশা' };
    Object.keys(prayerCounts).forEach(key => {
        const missed = daysPassed - prayerCounts[key];
        if (missed > maxMissedCount) { maxMissedCount = missed; mostMissedName = bnNames[key]; }
    });
    safeSetText('total-missed-count', totalMissed > 0 ? totalMissed : 0);
    safeSetText('most-missed-prayer', totalMissed > 0 ? mostMissedName : 'নেই');
}

function initQibla() {
    const kaaba = { lat: 21.4225, lng: 39.8262 };
    const qiblaDeg = calculateQibla(userLocation.lat, userLocation.lng, kaaba.lat, kaaba.lng);
    safeSetText('qibla-degree', `${Math.round(qiblaDeg)}°`);
    document.getElementById('qibla-pointer-group')?.setAttribute('transform', `rotate(${qiblaDeg}, 100, 100)`);
    
    if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.getElementById('qibla-permission-btn')?.classList.remove('hidden');
        } else {
            startCompass(qiblaDeg);
        }
    }
}

window.requestQiblaPermission = async () => {
    try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') {
            document.getElementById('qibla-permission-btn')?.classList.add('hidden');
            const kaaba = { lat: 21.4225, lng: 39.8262 };
            const qiblaDeg = calculateQibla(userLocation.lat, userLocation.lng, kaaba.lat, kaaba.lng);
            startCompass(qiblaDeg);
        }
    } catch (e) { showToast('পারমিশন পাওয়া যায়নি'); }
};

function startCompass(qiblaDeg) {
    window.addEventListener('deviceorientationabsolute', (e) => {
        const compass = e.alpha || e.webkitCompassHeading || 0;
        const dial = document.getElementById('compass-dial');
        if (dial) dial.style.transform = `rotate(${-compass}deg)`;
        const currentHeading = (360 - compass) % 360;
        const diff = Math.abs(currentHeading - qiblaDeg);
        const status = document.getElementById('qibla-status');
        if (status) {
            if (diff < 5 || diff > 355) {
                status.innerText = 'সঠিক দিক!'; status.classList.add('bg-emerald-500', 'text-white'); status.classList.remove('bg-slate-100', 'text-slate-500');
            } else {
                status.innerText = 'কিবলার দিকে ঘুরুন'; status.classList.remove('bg-emerald-500', 'text-white'); status.classList.add('bg-slate-100', 'text-slate-500');
            }
        }
    }, true);
}

function calculateQibla(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(Δλ), x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

window.loadDonors = async function() {
    const list = document.getElementById('donor-list');
    const group = document.getElementById('blood-filter')?.value;
    if (!list) return;
    list.innerHTML = '<div class="flex justify-center py-10"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div></div>';
    try {
        let query = supabaseClient.from('blood_donors').select('*');
        if (group) query = query.eq('blood_group', group);
        const { data } = await query;
        list.innerHTML = data?.length ? data.map(d => `
            <div class="glass-card p-5 border-l-4 border-red-500 flex justify-between items-center">
                <div><p class="font-bold text-slate-900 text-sm">${d.name} <span class="text-red-600">(${d.blood_group})</span></p><p class="text-[10px] text-slate-500"><i class="fas fa-map-marker-alt mr-1"></i> ${d.location}</p></div>
                <a href="tel:${d.contact}" class="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center"><i class="fas fa-phone text-xs"></i></a>
            </div>
        `).join('') : '<p class="text-center py-10 text-slate-400 text-xs">কোনো দাতা পাওয়া যায়নি।</p>';
    } catch (e) { list.innerHTML = '<p class="text-center py-10 text-slate-400 text-xs">ডেটা লোড করা সম্ভব হয়নি।</p>'; }
};

window.openDonorModal = () => document.getElementById('donor-modal')?.classList.add('active');
window.closeDonorModal = () => document.getElementById('donor-modal')?.classList.remove('active');

window.registerDonor = async function() {
    const name = document.getElementById('donor-name')?.value, group = document.getElementById('donor-group')?.value, loc = document.getElementById('donor-location')?.value, contact = document.getElementById('donor-contact')?.value;
    if (!name || !group || !loc || !contact) return showToast('সব তথ্য দিন');
    try {
        const { error } = await supabaseClient.from('blood_donors').insert([{ name, blood_group: group, location: loc, contact }]);
        if (error) throw error;
        showToast('নিবন্ধিত হয়েছেন');
        closeDonorModal();
        loadDonors();
    } catch (e) { showToast(e.message); }
};