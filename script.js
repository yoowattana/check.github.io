// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3XjsAmy25SZbMw7wNdOUGJ2iWor8PQf_0gXT7qCl9HJ-XT0UWglVwNunnoSDgRleY/exec';

// Work time configuration
const WORK_START_TIME = '08:00';
const WORK_END_TIME = '17:00';
const LATE_THRESHOLD = 15; // minutes

// Global variables
let currentUser = null;
let userLocation = null;
let checkInStatus = false;
let locationWatchId = null;
let todayHoliday = null;
let allHolidays = [];
let currentFilter = 'all';

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const loginForm = document.getElementById('loginForm');
const employeeIdInput = document.getElementById('employeeId');
const userNameSpan = document.getElementById('userName');
const currentTimeSpan = document.getElementById('currentTime');
const currentDateSpan = document.getElementById('currentDate');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const locationStatus = document.getElementById('locationStatus');
const locationCoordinates = document.getElementById('locationCoordinates');
const locationAccuracy = document.getElementById('locationAccuracy');
const holidayIndicator = document.getElementById('holidayIndicator');
const holidayText = document.getElementById('holidayText');
const checkInBtn = document.getElementById('checkInBtn');
const checkOutBtn = document.getElementById('checkOutBtn');
const otRequestBtn = document.getElementById('otRequestBtn');
const leaveRequestBtn = document.getElementById('leaveRequestBtn');
const logoutBtn = document.getElementById('logoutBtn');
const otModal = document.getElementById('otModal');
const leaveModal = document.getElementById('leaveModal');
const otForm = document.getElementById('otForm');
const leaveForm = document.getElementById('leaveForm');
const leaveTypeSelect = document.getElementById('leaveType');
const certificateGroup = document.getElementById('certificateGroup');
const medicalCertificate = document.getElementById('medicalCertificate');
const fileName = document.getElementById('fileName');
const successMessage = document.getElementById('successMessage');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Set default dates
    document.getElementById('otDate').valueAsDate = new Date();
    document.getElementById('leaveStartDate').valueAsDate = new Date();
    document.getElementById('leaveEndDate').valueAsDate = new Date();
    
    setupEventListeners();
}

function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Check in/out buttons
    checkInBtn.addEventListener('click', () => recordAttendance('เข้างาน'));
    checkOutBtn.addEventListener('click', () => recordAttendance('ออกงาน'));
    
    // Modal buttons
    otRequestBtn.addEventListener('click', () => otModal.style.display = 'block');
    leaveRequestBtn.addEventListener('click', () => leaveModal.style.display = 'block');
    
    // Close modals
    document.getElementById('closeOtModal').addEventListener('click', () => otModal.style.display = 'none');
    document.getElementById('closeLeaveModal').addEventListener('click', () => leaveModal.style.display = 'none');
    
    // Form submissions
    otForm.addEventListener('submit', handleOTRequest);
    leaveForm.addEventListener('submit', handleLeaveRequest);
    
    // Leave form specific
    leaveTypeSelect.addEventListener('change', handleLeaveTypeChange);
    medicalCertificate.addEventListener('change', handleFileSelect);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === otModal) otModal.style.display = 'none';
        if (event.target === leaveModal) leaveModal.style.display = 'none';
    });
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    };
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    currentTimeSpan.textContent = now.toLocaleTimeString('th-TH', timeOptions);
    currentDateSpan.textContent = now.toLocaleDateString('th-TH', dateOptions);
}

// Request location permission and start tracking
function requestLocationPermission() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }

        locationStatus.textContent = 'กำลังขออนุญาตเข้าถึงตำแหน่ง...';

        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                
                updateLocationDisplay();
                startLocationTracking();
                resolve(userLocation);
            },
            function(error) {
                let errorMessage = 'ไม่สามารถระบุตำแหน่งได้';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'ผู้ใช้ปฏิเสธการเข้าถึงตำแหน่ง';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'ข้อมูลตำแหน่งไม่พร้อมใช้งาน';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'หมดเวลาในการระบุตำแหน่ง';
                        break;
                }
                
                locationStatus.textContent = errorMessage;
                userLocation = null;
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    });
}

// Start continuous location tracking
function startLocationTracking() {
    if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
    }

    locationWatchId = navigator.geolocation.watchPosition(
        function(position) {
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            updateLocationDisplay();
        },
        function(error) {
            console.error('Location tracking error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 60000 // 1 minute
        }
    );
}

// Update location display
function updateLocationDisplay() {
    if (userLocation) {
        locationStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #34c759;"></i> ตำแหน่งพร้อมใช้งาน';
        
        locationCoordinates.textContent = `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`;
        locationCoordinates.classList.remove('hidden');
        
        const accuracyText = `ความแม่นยำ: ${Math.round(userLocation.accuracy)} เมตร`;
        locationAccuracy.textContent = accuracyText;
        locationAccuracy.classList.remove('hidden');
    }
}

// Check for holidays
async function checkHolidays() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${SCRIPT_URL}?action=checkHoliday&date=${today}`);
        const result = await response.json();
        
        if (result.success && result.isHoliday) {
            todayHoliday = result.holidayName;
            holidayText.textContent = `วันหยุด: ${result.holidayName}`;
            holidayIndicator.classList.remove('hidden');
        } else {
            holidayIndicator.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking holidays:', error);
    }
}

// Load all holidays
async function loadAllHolidays() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllHolidays`);
        const result = await response.json();
        
        if (result.success && result.holidays) {
            allHolidays = result.holidays.map(holiday => ({
                date: new Date(holiday.date),
                name: holiday.name,
                dateStr: holiday.date
            }));
            
            // Sort holidays by date
            allHolidays.sort((a, b) => a.date - b.date);
            
            displayHolidays();
            document.getElementById('holidaysLoading').classList.add('hidden');
            document.getElementById('holidaysFilter').classList.remove('hidden');
            document.getElementById('holidaysList').classList.remove('hidden');
        } else {
            showHolidaysError();
        }
    } catch (error) {
        console.error('Error loading holidays:', error);
        showHolidaysError();
    }
}

// Show holidays error
function showHolidaysError() {
    document.getElementById('holidaysLoading').classList.add('hidden');
    document.getElementById('holidaysError').classList.remove('hidden');
}

// Display holidays based on current filter
function displayHolidays() {
    const holidaysList = document.getElementById('holidaysList');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filteredHolidays = allHolidays;
    
    // Apply filter
    switch (currentFilter) {
        case 'upcoming':
            filteredHolidays = allHolidays.filter(holiday => holiday.date > today);
            break;
        case 'current':
            filteredHolidays = allHolidays.filter(holiday => 
                holiday.date.getTime() === today.getTime()
            );
            break;
        case 'past':
            filteredHolidays = allHolidays.filter(holiday => holiday.date < today);
            break;
        default:
            filteredHolidays = allHolidays;
    }
    
    if (filteredHolidays.length === 0) {
        holidaysList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-light);">
                <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>ไม่มีวันหยุดในหมวดหมู่นี้</p>
            </div>
        `;
        return;
    }
    
    const holidaysHTML = filteredHolidays.map(holiday => {
        const holidayDate = holiday.date;
        const isToday = holidayDate.getTime() === today.getTime();
        const isUpcoming = holidayDate > today;
        const isPast = holidayDate < today;
        
        let statusClass = '';
        let statusText = '';
        let itemClass = '';
        
        if (isToday) {
            statusClass = 'today';
            statusText = 'วันนี้';
            itemClass = 'today';
        } else if (isUpcoming) {
            statusClass = 'upcoming';
            const daysUntil = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));
            statusText = `อีก ${daysUntil} วัน`;
            itemClass = 'upcoming';
        } else {
            statusClass = 'past';
            statusText = 'ผ่านไปแล้ว';
        }
        
        const formattedDate = holidayDate.toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        return `
            <div class="holiday-item ${itemClass}">
                <div class="holiday-date">${formattedDate}</div>
                <div class="holiday-name">${holiday.name}</div>
                <div class="holiday-status ${statusClass}">${statusText}</div>
            </div>
        `;
    }).join('');
    
    holidaysList.innerHTML = holidaysHTML;
}

// Filter button handlers
function setupHolidayFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current filter
            currentFilter = this.dataset.filter;
            
            // Re-display holidays
            displayHolidays();
        });
    });
}

// Swift Alert System
function showSwiftAlert(type, title, message, details = null) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.swift-alert');
    existingAlerts.forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = 'swift-alert';
    
    let iconClass = '';
    switch(type) {
        case 'success':
            iconClass = 'fas fa-check';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-triangle';
            break;
        case 'danger':
            iconClass = 'fas fa-times';
            break;
        case 'info':
            iconClass = 'fas fa-info';
            break;
    }

    alert.innerHTML = `
        <div class="swift-alert-header">
            <div class="swift-alert-icon ${type}">
                <i class="${iconClass}"></i>
            </div>
            <h3 class="swift-alert-title">${title}</h3>
        </div>
        <div class="swift-alert-body">
            <p class="swift-alert-message">${message}</p>
            ${details ? `<div class="swift-alert-details">${details}</div>` : ''}
            <button class="swift-alert-button" onclick="this.closest('.swift-alert').remove()">
                ตกลง
            </button>
        </div>
    `;

    document.body.appendChild(alert);
    
    // Trigger animation
    setTimeout(() => {
        alert.classList.add('show');
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// Calculate attendance status
function calculateAttendanceStatus(action) {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5); // HH:MM format
    
    if (action === 'เข้างาน') {
        const workStart = new Date(`${now.toDateString()} ${WORK_START_TIME}`);
        const lateThreshold = new Date(workStart.getTime() + (LATE_THRESHOLD * 60000));
        
        if (now <= workStart) {
            return {
                status: 'ตรงเวลา',
                type: 'success',
                message: 'คุณเข้างานตรงเวลา',
                details: `เวลาเข้างาน: ${timeStr} (กำหนด: ${WORK_START_TIME})`
            };
        } else if (now <= lateThreshold) {
            const minutesLate = Math.round((now - workStart) / 60000);
            return {
                status: 'เข้างานสาย',
                type: 'warning',
                message: `คุณเข้างานสาย ${minutesLate} นาที`,
                details: `เวลาเข้างาน: ${timeStr} (กำหนด: ${WORK_START_TIME})`
            };
        } else {
            const minutesLate = Math.round((now - workStart) / 60000);
            return {
                status: 'เข้างานสายมาก',
                type: 'danger',
                message: `คุณเข้างานสาย ${minutesLate} นาที`,
                details: `เวลาเข้างาน: ${timeStr} (กำหนด: ${WORK_START_TIME})`
            };
        }
    } else if (action === 'ออกงาน') {
        const workEnd = new Date(`${now.toDateString()} ${WORK_END_TIME}`);
        
        if (now >= workEnd) {
            return {
                status: 'ออกงานตรงเวลา',
                type: 'success',
                message: 'คุณออกงานตรงเวลา',
                details: `เวลาออกงาน: ${timeStr} (กำหนด: ${WORK_END_TIME})`
            };
        } else {
            const minutesEarly = Math.round((workEnd - now) / 60000);
            return {
                status: 'ออกงานก่อนเวลา',
                type: 'warning',
                message: `คุณออกงานก่อนเวลา ${minutesEarly} นาที`,
                details: `เวลาออกงาน: ${timeStr} (กำหนด: ${WORK_END_TIME})`
            };
        }
    }
}

// Login form handler
async function handleLogin(e) {
    e.preventDefault();
    
    const employeeId = employeeIdInput.value.trim();
    if (!employeeId) return;

    try {
        showAlert('loginAlert', 'กำลังตรวจสอบข้อมูล...', 'success');
        
        // Request location permission first
        try {
            await requestLocationPermission();
        } catch (locationError) {
            console.warn('Location permission denied, continuing without location');
        }
        
        const response = await fetch(`${SCRIPT_URL}?action=login&employeeId=${encodeURIComponent(employeeId)}`);
        const result = await response.json();
        
        if (result.success) {
            currentUser = {
                id: employeeId,
                name: result.employeeName
            };
            
            userNameSpan.textContent = result.employeeName;
            loginScreen.classList.add('hidden');
            mainScreen.classList.remove('hidden');
            
            // Check holidays and current status
            await Promise.all([
                checkHolidays(),
                checkCurrentStatus(),
                loadAllHolidays()
            ]);
            
            // Setup holiday filters
            setupHolidayFilters();
            
            // Show login success alert
            showSwiftAlert('success', 'เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับ ${result.employeeName}`);
        } else {
            showSwiftAlert('danger', 'เข้าสู่ระบบล้มเหลว', 'ไม่พบรหัสพนักงานในระบบ');
        }
    } catch (error) {
        showSwiftAlert('danger', 'เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
}

// Check current status
async function checkCurrentStatus() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=checkStatus&employeeId=${encodeURIComponent(currentUser.id)}`);
        const result = await response.json();
        
        if (result.success) {
            checkInStatus = result.isCheckedIn;
            updateStatusDisplay();
        }
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

// Update status display
function updateStatusDisplay() {
    if (checkInStatus) {
        statusDot.classList.add('checked-in');
        statusText.textContent = 'ลงเวลาเข้างานแล้ว';
        checkInBtn.style.opacity = '0.5';
        checkInBtn.style.pointerEvents = 'none';
        checkOutBtn.style.opacity = '1';
        checkOutBtn.style.pointerEvents = 'auto';
    } else {
        statusDot.classList.remove('checked-in');
        statusText.textContent = 'ยังไม่ได้ลงเวลา';
        checkInBtn.style.opacity = '1';
        checkInBtn.style.pointerEvents = 'auto';
        checkOutBtn.style.opacity = '0.5';
        checkOutBtn.style.pointerEvents = 'none';
    }
}

// Record attendance
async function recordAttendance(action) {
    try {
        const locationStr = userLocation ? 
            `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}` : 
            'ไม่สามารถระบุตำแหน่งได้';

        const data = {
            action: 'recordAttendance',
            userName: currentUser.name,
            attendanceAction: action,
            location: locationStr,
            accuracy: userLocation ? userLocation.accuracy : null
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data)
        });

        const result = await response.json();
        
        if (result.success) {
            checkInStatus = action === 'เข้างาน';
            updateStatusDisplay();
            
            // Calculate and show attendance status
            const attendanceStatus = calculateAttendanceStatus(action);
            showSwiftAlert(
                attendanceStatus.type,
                attendanceStatus.status,
                attendanceStatus.message,
                attendanceStatus.details
            );
        } else {
            showSwiftAlert('danger', 'เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกเวลาได้');
        }
    } catch (error) {
        showSwiftAlert('danger', 'เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
}

// OT request form handler
async function handleOTRequest(e) {
    e.preventDefault();
    
    try {
        const data = {
            action: 'submitOTRequest',
            userName: currentUser.name,
            date: document.getElementById('otDate').value,
            time: document.getElementById('otTime').value,
            reason: document.getElementById('otReason').value
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data)
        });

        const result = await response.json();
        
        if (result.success) {
            otModal.style.display = 'none';
            otForm.reset();
            document.getElementById('otDate').valueAsDate = new Date();
            showSwiftAlert('success', 'ส่งคำขอสำเร็จ', 'คำขอทำโอทีของคุณถูกส่งเรียบร้อยแล้ว');
        } else {
            showSwiftAlert('danger', 'เกิดข้อผิดพลาด', 'ไม่สามารถส่งคำขอได้');
        }
    } catch (error) {
        showSwiftAlert('danger', 'เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
}

// Leave request form handler
async function handleLeaveRequest(e) {
    e.preventDefault();
    
    const submitButton = leaveForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    try {
        // Show loading state
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังส่งคำขอ...';
        submitButton.disabled = true;

        // Prepare form data
        const formData = new FormData();
        formData.append('action', 'submitLeaveRequest');
        formData.append('userName', currentUser.name);
        formData.append('leaveType', leaveTypeSelect.value);
        formData.append('startDate', document.getElementById('leaveStartDate').value);
        formData.append('endDate', document.getElementById('leaveEndDate').value);
        formData.append('reason', document.getElementById('leaveReason').value);

        // Add medical certificate if exists
        if (medicalCertificate.files[0]) {
            formData.append('medicalCertificate', medicalCertificate.files[0]);
        }

        // Send request
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            // Show success message
            successMessage.style.display = 'block';
            
            // Reset form after 2 seconds
            setTimeout(() => {
                leaveModal.style.display = 'none';
                leaveForm.reset();
                successMessage.style.display = 'none';
                certificateGroup.style.display = 'none';
                fileName.textContent = '';
            }, 2000);
            
            showSwiftAlert('success', 'ส่งคำขอสำเร็จ', 'คำขอลาของคุณถูกส่งเรียบร้อยแล้ว');
        } else {
            throw new Error(result.message || 'ไม่สามารถส่งคำขอได้');
        }

    } catch (error) {
        console.error('Error submitting leave request:', error);
        showSwiftAlert('danger', 'เกิดข้อผิดพลาด', error.message || 'ไม่สามารถส่งคำขอได้');
    } finally {
        // Reset button state
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// Handle leave type change
function handleLeaveTypeChange() {
    if (this.value === 'ลาป่วย') {
        certificateGroup.style.display = 'block';
    } else {
        certificateGroup.style.display = 'none';
        fileName.textContent = '';
    }
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showSwiftAlert('warning', 'ไฟล์ใหญ่เกินไป', 'ขนาดไฟล์ต้องไม่เกิน 5MB');
            e.target.value = '';
            fileName.textContent = '';
            return;
        }
        
        fileName.textContent = file.name;
    } else {
        fileName.textContent = '';
    }
}

// Logout handler
function handleLogout() {
    // Stop location tracking
    if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
    
    currentUser = null;
    userLocation = null;
    checkInStatus = false;
    todayHoliday = null;
    allHolidays = [];
    currentFilter = 'all';
    
    mainScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    employeeIdInput.value = '';
    document.getElementById('loginAlert').innerHTML = '';
    document.getElementById('mainAlert').innerHTML = '';
    
    // Reset location display
    locationStatus.textContent = 'กำลังตรวจสอบตำแหน่ง...';
    locationCoordinates.classList.add('hidden');
    locationAccuracy.classList.add('hidden');
    holidayIndicator.classList.add('hidden');
    
    // Show logout success alert
    showSwiftAlert('info', 'ออกจากระบบ', 'คุณได้ออกจากระบบเรียบร้อยแล้ว');
}

// Show alert (for simple alerts)
function showAlert(containerId, message, type = 'success') {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}