import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Info,
  LogIn,
  LogOut,
  Moon,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  User,
  X
} from 'lucide-react';
import { apiRequest, getStoredToken, setStoredToken } from './api.js';
import { MESSAGES } from './i18n.js';

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const WEEKDAYS = [1, 2, 3, 4, 5];

const DEPT_EN_MAP = {
  '通識教育中心 (10000)': 'General Education Center (10000)',
  '護理系 (11140)': 'Nursing (11140)',
  '高齡健康照護系 (13140)': 'Gerontological Health Care (13140)',
  '健康事業管理系 (21140)': 'Health Care Management (21140)',
  '資訊管理系 (22140)': 'Information Management (22140)',
  '休閒產業與健康促進系 (23140)': 'Leisure Industry & Health Promotion (23140)',
  '語言治療與聽力學系 (25140)': 'Speech-Language Pathology & Audiology (25140)',
  '嬰幼兒保育系 (31140)': 'Infant & Child Care (31140)',
  '運動保健系 (32140)': 'Exercise & Health Science (32140)',
  '生死與健康心理諮商系 (33140)': 'Thanatology & Health Counseling (33140)',
  '跨領域學位學程 (41140)': 'Interdisciplinary Program (41140)',
  '智慧健康照護跨領域學士學位學程 (42140)': 'Smart Healthcare Interdisciplinary Program (42140)'
};

const CATEGORY_EN_MAP = {
  '專業必修(系所)': 'Major Required',
  '專業選修(系所)': 'Major Elective',
  '通識必修(通識)': 'General Ed Required',
  '通識選修(通識)': 'General Ed Elective'
};

const normalizeCourseName = (name) =>
  String(name || '')
    .replace(/（.*?）|\(.*?\)/g, '')
    .trim()
    .toLowerCase();

const AI_PROGRAM_SET = new Set(
  [
    '統計學',
    '研究概論',
    '經濟學',
    '進階統計學應用',
    '健康照護資料分析與決策',
    '統計套裝軟體',
    '資料倉儲',
    '健康照護資料處理',
    '人工智慧',
    'LINUX系統實務',
    '管理數學',
    '資訊與法律',
    '提示工程與商務應用',
    '統計應用與資料分析',
    '程式設計邏輯',
    '品質分析統計應用',
    'SAS基礎資料處理',
    '行動軟體APP設計',
    'SAS應用資料處理',
    '商業智慧',
    'C#.NET程式開發與應用',
    '巨量資料分析工具與應用',
    '雲端運算研討',
    '健康照護物聯網導論',
    'Python程式設計',
    '產業經營績效之大數據分析',
    '機器學習程式設計'
  ].map(normalizeCourseName)
);

const MED_PROGRAM_SET = new Set(
  [
    '醫療資訊概論',
    '組織行為學',
    '健康經濟學',
    '健康保險學',
    '健康政策與策略',
    '健康照護管理學',
    '健康照護品質管理學',
    '健康照護行銷管理學',
    '健康照護財務管理學',
    '健康照護人力資源管理學',
    '專案管理',
    '醫院電腦化實務與應用',
    '健康照護資訊系統',
    '健康照護資料處理',
    '健康照護管理實習',
    '醫療機構見習',
    '科技策略',
    'SAS基礎資料處理',
    'SAS應用資料處理',
    '醫療機構管理實務'
  ].map(normalizeCourseName)
);

export default function App() {
  const [lang, setLang] = useState('zh');
  const t = MESSAGES[lang];
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('ntunhs_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('ntunhs_dark_mode', String(darkMode));
    } catch {
      // Ignore storage errors
    }
  }, [darkMode]);

  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'search'
  ); // search | mobile | admin | auth
  const [mobileView, setMobileView] = useState('search'); // search | schedule
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);

  // Metadata
  const [meta, setMeta] = useState({ semesters: ['1151', '1142'], departments: [], categories: [], programs: [] });

  // Filters
  const [filters, setFilters] = useState({
    semester: '1151',
    department: 'ALL',
    category: 'ALL',
    grade: '',
    tag: 'ALL',
    program: 'ALL',
    weekday: '',
    periods: [],
    matchMode: 'strict',
    keyword: '',
    hideConflicts: false,
    page: 1
  });

  // Courses & Schedule
  const [courseResult, setCourseResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [completedCourses, setCompletedCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('ntunhs_completed_courses');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [completedCourseDetails, setCompletedCourseDetails] = useState(() => {
    try {
      const saved = localStorage.getItem('ntunhs_completed_course_details');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [sharedView, setSharedView] = useState(null);

  // Auth form
  const [authMode, setAuthMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '', name: '', department: '資訊管理系 (22140)', grade: 3 });

  // Graduation progress manual adjustments & simulation toggle (default: completed courses only)
  const [includePlannedInGrad, setIncludePlannedInGrad] = useState(false);
  const [expandedBars, setExpandedBars] = useState({});
  const toggleBarExpand = (key) => setExpandedBars((prev) => ({ ...prev, [key]: !prev[key] }));
  const [showGradSettings, setShowGradSettings] = useState(false);
  const [gradAssume, setGradAssume] = useState({
    extraProfElective: 0,
    extraGenElective: 0,
    extraCrossDept: 0
  });

  // Admin form
  const [newCourse, setNewCourse] = useState({
    code: '',
    semester: '1151',
    department: '資訊管理系 (22140)',
    name_zh: '',
    name_en: '',
    credits: 2,
    category: '專業選修(系所)',
    teacher_name: '',
    weekday: 1,
    periods: '3,4',
    room: 'F601',
    min_grade: 1
  });
  const [importJson, setImportJson] = useState('');
  const [editingCourse, setEditingCourse] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load shared schedule if ?share=token is present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('share');
    if (shareToken) {
      apiRequest(`/api/schedule/shared/${encodeURIComponent(shareToken)}`)
        .then((data) => setSharedView(data))
        .catch((err) => showToast(err.message, 'error'));
    }
  }, []);

  // Load meta & current user on startup
  useEffect(() => {
    apiRequest('/api/courses/meta')
      .then((data) => setMeta(data))
      .catch(() => {});

    if (getStoredToken()) {
      apiRequest('/api/auth/me')
        .then((data) => setUser(data.user))
        .catch(() => setStoredToken(''));
    }
  }, []);

  // Load user's schedule when logged in
  const refreshSchedule = async () => {
    if (!getStoredToken()) {
      setSchedule([]);
      return;
    }
    try {
      const data = await apiRequest('/api/schedule');
      setSchedule(data.items || []);
    } catch {
      setSchedule([]);
    }
  };

  useEffect(() => {
    refreshSchedule();
    if (user && Array.isArray(user.completed_courses)) {
      setCompletedCourses(user.completed_courses);
      setCompletedCourseDetails(Array.isArray(user.completed_course_details) ? user.completed_course_details : []);
    }
  }, [user]);

  // Debounced AJAX course query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, user]);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const params = new URLSearchParams();
      if (filters.semester) params.set('semester', filters.semester);
      if (filters.department) params.set('department', filters.department);
      if (filters.category) params.set('category', filters.category);
      if (filters.grade) params.set('grade', filters.grade);
      if (filters.tag) params.set('tag', filters.tag);
      if (filters.program) params.set('program', filters.program);
      if (filters.weekday) params.set('weekday', filters.weekday);
      if (filters.periods.length > 0) params.set('periods', filters.periods.join(','));
      params.set('matchMode', filters.matchMode);
      if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim());
      if (filters.hideConflicts) params.set('hideConflicts', 'true');
      params.set('page', String(filters.page));
      params.set('limit', '10');

      const data = await apiRequest(`/api/courses?${params.toString()}`);
      setCourseResult(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingCourses(false);
    }
  };

  const togglePeriodFilter = (p) => {
    setFilters((prev) => {
      const exists = prev.periods.includes(p);
      const next = exists ? prev.periods.filter((x) => x !== p) : [...prev.periods, p].sort((a, b) => a - b);
      return { ...prev, periods: next, page: 1 };
    });
  };

  const handleEmptySlotClick = (weekday, period) => {
    setFilters((prev) => ({
      ...prev,
      department: 'ALL',
      weekday: String(weekday),
      periods: [period],
      matchMode: 'flexible',
      page: 1
    }));
    if (activeTab === 'mobile') {
      setMobileView('search');
    }
    showToast(
      lang === 'zh'
        ? `已自動篩選 ${t.weekdays[weekday]} 第 ${period} 節可選課程`
        : `Filtered courses for ${t.weekdays[weekday]} Period ${period}`
    );
  };

  const handleResetFilters = () => {
    setFilters({
      semester: '1151',
      department: 'ALL',
      category: 'ALL',
      grade: '',
      tag: 'ALL',
      program: 'ALL',
      weekday: '',
      periods: [],
      matchMode: 'strict',
      keyword: '',
      hideConflicts: false,
      page: 1
    });
  };

  const handleAddToSchedule = async (courseId) => {
    if (!user) {
      showToast(t.loginPrompt, 'error');
      setActiveTab('auth');
      return;
    }
    try {
      await apiRequest('/api/schedule', {
        method: 'POST',
        body: JSON.stringify({ courseId })
      });
      await refreshSchedule();
      showToast(lang === 'zh' ? '已加入預排課表' : 'Added to planned schedule', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveFromSchedule = async (courseId) => {
    try {
      await apiRequest(`/api/schedule/${courseId}`, { method: 'DELETE' });
      await refreshSchedule();
      showToast(lang === 'zh' ? '已從預排課表移除' : 'Removed from schedule');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleShareSchedule = async () => {
    if (!user) {
      showToast(t.loginPrompt, 'error');
      return;
    }
    try {
      const data = await apiRequest('/api/schedule/share', {
        method: 'POST',
        body: JSON.stringify({ semester: filters.semester || '1151' })
      });
      const url = `${window.location.origin}/?share=${data.token}`;
      setShareUrl(url);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });
      setStoredToken(data.token);
      setUser(data.user);
      setActiveTab('search');
      showToast(lang === 'zh' ? `歡迎，${data.user.name}` : `Welcome, ${data.user.name}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleLogout = () => {
    setStoredToken('');
    setUser(null);
    setSchedule([]);
    showToast(lang === 'zh' ? '已登出系統' : 'Signed out');
  };

  const handleAdminCreate = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/courses', {
        method: 'POST',
        body: JSON.stringify(newCourse)
      });
      showToast(lang === 'zh' ? '新增課程成功' : 'Course created', 'success');
      fetchCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdminDelete = async (id) => {
    try {
      await apiRequest(`/api/courses/${id}`, { method: 'DELETE' });
      showToast(lang === 'zh' ? '已刪除課程' : 'Course deleted');
      fetchCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdminUpdate = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      await apiRequest(`/api/courses/${editingCourse.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingCourse)
      });
      showToast(lang === 'zh' ? '更新課程成功' : 'Course updated', 'success');
      setEditingCourse(null);
      fetchCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdminImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      const courses = Array.isArray(parsed) ? parsed : parsed.courses;
      const res = await apiRequest('/api/courses/import', {
        method: 'POST',
        body: JSON.stringify({ courses })
      });
      showToast(`匯入完成：成功 ${res.inserted} 筆`, 'success');
      setImportJson('');
      fetchCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const scheduledIds = useMemo(() => new Set(schedule.map((c) => c.id)), [schedule]);

  const completedCodeSet = useMemo(() => new Set(completedCourses.map(String)), [completedCourses]);

  const isCourseCompleted = (course) => {
    const code = String(course.code || '');
    const baseCode = code.split('_')[0];
    const subjCode = baseCode.length >= 9 ? baseCode.slice(5, 9) : '';
    return (
      completedCodeSet.has(code) ||
      completedCodeSet.has(baseCode) ||
      (subjCode && completedCodeSet.has(subjCode))
    );
  };

  const handleToggleCompleted = async (course) => {
    const rawCode = String(course.code || '');
    const baseCode = rawCode.split('_')[0];
    const subjCode = baseCode.length >= 9 ? baseCode.slice(5, 9) : '';
    const codeToToggle = completedCodeSet.has(rawCode)
      ? rawCode
      : completedCodeSet.has(baseCode)
        ? baseCode
        : subjCode && completedCodeSet.has(subjCode)
          ? subjCode
          : rawCode;
    if (!codeToToggle) return;

    if (user && getStoredToken()) {
      try {
        const res = await apiRequest('/api/auth/completed-courses/toggle', {
          method: 'POST',
          body: JSON.stringify({ courseCode: codeToToggle })
        });
        setCompletedCourses(res.completed_courses || []);
        setCompletedCourseDetails(res.completed_course_details || []);
        showToast(
          res.completed
            ? lang === 'zh'
              ? `已備註「${course.name_zh}」為已修過`
              : `Marked "${course.name_en}" as completed`
            : lang === 'zh'
              ? `已取消「${course.name_zh}」的已修過備註`
              : `Unmarked "${course.name_en}"`,
          'info'
        );
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    const exists = completedCourses.includes(codeToToggle);
    const nextCodes = exists ? completedCourses.filter((item) => item !== codeToToggle) : [...completedCourses, codeToToggle];
    const nextDetails = exists
      ? completedCourseDetails.filter((item) => item.code !== codeToToggle)
      : [
          ...completedCourseDetails,
          {
            code: codeToToggle,
            name_zh: course.name_zh,
            name_en: course.name_en,
            credits: course.credits,
            category: course.category,
            department: course.department,
            tags: course.tags || ''
          }
        ];
    setCompletedCourses(nextCodes);
    setCompletedCourseDetails(nextDetails);
    try {
      localStorage.setItem('ntunhs_completed_courses', JSON.stringify(nextCodes));
      localStorage.setItem('ntunhs_completed_course_details', JSON.stringify(nextDetails));
    } catch {
      // Ignore storage errors
    }
    showToast(
      !exists
        ? lang === 'zh'
          ? `已備註「${course.name_zh}」為已修過`
          : `Marked "${course.name_en}" as completed`
        : lang === 'zh'
          ? `已取消「${course.name_zh}」的已修過備註`
          : `Unmarked "${course.name_en}"`,
      'info'
    );
  };

  const getScheduleConflict = (course) => {
    if (!course) return null;
    const coursePeriods = new Set(
      String(course.periods || '')
        .split(',')
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isInteger(n))
    );
    return (
      schedule.find((s) => {
        if (s.id === course.id || s.weekday !== course.weekday) return false;
        if (s.period_mask && course.period_mask && (s.period_mask & course.period_mask) > 0) {
          return true;
        }
        const sPeriods = String(s.periods || '')
          .split(',')
          .map((p) => Number.parseInt(p.trim(), 10));
        return sPeriods.some((p) => coursePeriods.has(p));
      }) || null
    );
  };

  const scheduleStats = useMemo(() => {
    let total = 0;
    let req = 0;
    let elec = 0;
    for (const c of schedule) {
      total += c.credits || 0;
      if (String(c.category).includes('必修')) req += c.credits || 0;
      else elec += c.credits || 0;
    }
    return { total, req, elec, left: Math.max(23 - total, 0) };
  }, [schedule]);

  const gradProgress = useMemo(() => {
    // 113 學年度資管系四技畢業門檻：總學分 128 = 通識必修 28 + 專業必修 62 + 選修 38 (專業選修>=19 + 一般選修19), 跨系/跨域 >=4
    const getEffectiveCredits = (c) => {
      const name = String(c.name_zh || '');
      const cat = String(c.category || '');
      // 體育必修與服務學習為 0 畢業學分
      if ((name.includes('體育-') || name === '基本運動素養') && cat.includes('通識必修')) return 0;
      if (name === '服務學習') return 0;
      return Number(c.credits) || 0;
    };

    const classifyCourse = (c) => {
      const cr = getEffectiveCredits(c);
      const cat = String(c.category || '');
      const name = String(c.name_zh || '');
      const dept = String(c.department || '');
      const tags = String(c.tags || '');
      const isIM = dept.includes('22140');
      let bucket = 'genElec';
      if (cat === '通識必修(通識)') bucket = 'genReq';
      else if (cat === '專業必修(系所)' && isIM) bucket = 'profReq';
      else if (cat === '專業選修(系所)' && isIM) bucket = 'profElec';

      const isCross =
        bucket !== 'genReq' &&
        bucket !== 'profReq' &&
        (tags.includes('跨域') ||
          tags.includes('跨系') ||
          (!isIM && !cat.includes('通識') && !name.includes('國際禮儀')));

      return { cr, bucket, isCross };
    };

    let doneGenReq = 0;
    let doneProfReq = 0;
    let doneProfElec = Number(gradAssume.extraProfElective) || 0;
    let doneGenElec = Number(gradAssume.extraGenElective) || 0;
    let doneCross = Number(gradAssume.extraCrossDept) || 0;
    let doneAiProg = 0;
    let doneMedProg = 0;

    let planGenReq = 0;
    let planProfReq = 0;
    let planProfElec = 0;
    let planGenElec = 0;
    let planCross = 0;
    let planAiProg = 0;
    let planMedProg = 0;

    const lists = {
      all: [],
      genReq: [],
      profReq: [],
      profElec: [],
      genElec: [],
      cross: [],
      aiProg: [],
      medProg: []
    };

    const pushCourse = (c, isPlanned) => {
      const { cr, bucket, isCross } = classifyCourse(c);
      const norm = normalizeCourseName(c.name_zh);
      const inAi = AI_PROGRAM_SET.has(norm);
      const inMed = MED_PROGRAM_SET.has(norm);
      const item = { code: c.code, name_zh: c.name_zh, credits: cr, isPlanned };

      lists.all.push(item);
      if (bucket === 'genReq') lists.genReq.push(item);
      else if (bucket === 'profReq') lists.profReq.push(item);
      else if (bucket === 'profElec') lists.profElec.push(item);
      else lists.genElec.push(item);

      if (isCross) lists.cross.push(item);
      if (inAi) lists.aiProg.push(item);
      if (inMed) lists.medProg.push(item);

      return { cr, bucket, isCross, inAi, inMed };
    };

    for (const c of completedCourseDetails) {
      const { cr, bucket, isCross, inAi, inMed } = pushCourse(c, false);
      if (bucket === 'genReq') doneGenReq += cr;
      else if (bucket === 'profReq') doneProfReq += cr;
      else if (bucket === 'profElec') doneProfElec += cr;
      else doneGenElec += cr;
      if (isCross) doneCross += cr;
      if (inAi) doneAiProg += cr;
      if (inMed) doneMedProg += cr;
    }

    for (const c of schedule) {
      if (isCourseCompleted(c)) continue;
      if (!includePlannedInGrad) {
        const { cr, bucket } = classifyCourse(c);
        if (bucket === 'genReq') planGenReq += cr;
        else if (bucket === 'profReq') planProfReq += cr;
        else if (bucket === 'profElec') planProfElec += cr;
        else planGenElec += cr;
        continue;
      }
      const { cr, bucket, isCross, inAi, inMed } = pushCourse(c, true);
      if (bucket === 'genReq') planGenReq += cr;
      else if (bucket === 'profReq') planProfReq += cr;
      else if (bucket === 'profElec') planProfElec += cr;
      else planGenElec += cr;
      if (isCross) planCross += cr;
      if (inAi) planAiProg += cr;
      if (inMed) planMedProg += cr;
    }

    const completedTotal = doneGenReq + doneProfReq + doneProfElec + doneGenElec;
    const plannedCredits = planGenReq + planProfReq + planProfElec + planGenElec;
    const genReq = doneGenReq + (includePlannedInGrad ? planGenReq : 0);
    const profReq = doneProfReq + (includePlannedInGrad ? planProfReq : 0);
    const profElec = doneProfElec + (includePlannedInGrad ? planProfElec : 0);
    const genElec = doneGenElec + (includePlannedInGrad ? planGenElec : 0);
    const totalElec = profElec + genElec;
    const cross = doneCross + (includePlannedInGrad ? planCross : 0);
    const aiProg = doneAiProg + (includePlannedInGrad ? planAiProg : 0);
    const medProg = doneMedProg + (includePlannedInGrad ? planMedProg : 0);
    const total = completedTotal + (includePlannedInGrad ? plannedCredits : 0);

    return {
      total,
      completedTotal,
      plannedCredits,
      genReq,
      profReq,
      profElec,
      genElec,
      totalElec,
      cross,
      aiProg,
      medProg,
      lists
    };
  }, [completedCourseDetails, completedCourses, schedule, gradAssume, includePlannedInGrad]);

  const slotLookup = useMemo(() => {
    const map = {};
    for (const c of schedule) {
      const pList = String(c.periods || '')
        .split(',')
        .map((s) => Number.parseInt(s.trim(), 10));
      for (const p of pList) {
        map[`${c.weekday}-${p}`] = c;
      }
    }
    return map;
  }, [schedule]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Top Navbar */}
      <header className="bg-[#163a5f] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-sky-300 shrink-0" />
            <h1 className="text-lg font-bold tracking-wide">{t.appTitle}</h1>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'search', label: t.tabSearch, icon: Search },
              { id: 'mobile', label: t.tabMobile, icon: Smartphone },
              { id: 'admin', label: t.tabAdmin, icon: ShieldCheck },
              {
                id: 'auth',
                label: user
                  ? lang === 'zh'
                    ? `4. 目前使用：${user.name}`
                    : `4. User: ${user.name}`
                  : t.tabAuth,
                icon: User
              }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap transition ${
                    active ? 'bg-white text-[#163a5f] shadow-sm' : 'bg-[#214b75] text-slate-100 hover:bg-[#2a5c8d]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 bg-[#214b75] px-3 py-1.5 rounded-md text-xs">
                <User className="w-3.5 h-3.5 text-sky-300" />
                <span className="whitespace-nowrap">{user.name}</span>
                <button onClick={handleLogout} className="text-rose-200 hover:text-white ml-1" title="登出">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className="bg-[#214b75] hover:bg-[#2a5c8d] px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.guest}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="bg-[#214b75] hover:bg-[#2a5c8d] px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1 whitespace-nowrap"
              title={darkMode ? '切換淺色模式' : '切換深色模式'}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-sky-200" />}
              <span>{darkMode ? (lang === 'zh' ? '淺色' : 'Light') : lang === 'zh' ? '深色' : 'Dark'}</span>
            </button>

            <button
              onClick={() => setLang((l) => (l === 'zh' ? 'en' : 'zh'))}
              className="border border-sky-300/40 hover:bg-[#214b75] px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>EN / 中文</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white ${
            toast.type === 'error' ? 'bg-rose-600' : toast.type === 'success' ? 'bg-emerald-600' : 'bg-slate-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5">
        {sharedView && (
          <div className="mb-4 bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sky-900 text-sm">
                分享的預排課表預覽（學期：{sharedView.semester}，共 {sharedView.items.length} 門課，已去除個人隱私資訊）
              </h2>
              <div className="mt-1 flex flex-wrap gap-2">
                {sharedView.items.map((c) => (
                  <span key={c.id} className="text-xs bg-white border border-sky-200 px-2 py-1 rounded">
                    {lang === 'zh' ? c.name_zh : c.name_en} (週{c.weekday} 第{c.periods}節)
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => setSharedView(null)} className="text-sky-700 hover:text-sky-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* TAB 1 & TAB 2: Search & Plan / Mobile RWD */}
        {(activeTab === 'search' || activeTab === 'mobile') && (
          <div className={`grid gap-5 ${activeTab === 'mobile' ? 'max-w-md mx-auto grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
            {activeTab === 'mobile' && (
              <div className="sticky top-2 z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-1.5 shadow-sm grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMobileView('search')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    mobileView === 'search' ? 'bg-[#163a5f] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '查課與選課' : 'Search'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileView('schedule')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    mobileView === 'schedule' ? 'bg-[#163a5f] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'zh'
                      ? `課表與進度 (${schedule.length}門/${scheduleStats.total}學分)`
                      : `Schedule (${schedule.length})`}
                  </span>
                </button>
              </div>
            )}

            {/* Left Column: Query + Results */}
            {(activeTab === 'search' || mobileView === 'search') && (
            <div className={`${activeTab === 'mobile' ? '' : 'lg:col-span-7'} space-y-4`}>
              {/* Filter Card */}
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base">{t.queryTitle}</h2>
                  {user && (
                    <span className="text-xs text-slate-500">
                      {user.department} · {user.grade}年級
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.semester}</label>
                    <select
                      value={filters.semester}
                      onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value, page: 1 }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="ALL">{t.allSemesters}</option>
                      {meta.semesters.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.department}</label>
                    <select
                      value={filters.department}
                      onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value, page: 1 }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="ALL">{t.allDepartments}</option>
                      {meta.departments.map((d) => (
                        <option key={d} value={d}>
                          {lang === 'en' ? DEPT_EN_MAP[d] || d : d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.category}</label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value, page: 1 }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="ALL">{t.allCategories}</option>
                      {(meta.categories || []).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.grade}</label>
                    <select
                      value={filters.grade}
                      onChange={(e) => setFilters((p) => ({ ...p, grade: e.target.value, page: 1 }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="">{t.allGrades}</option>
                      {[1, 2, 3, 4].map((g) => (
                        <option key={g} value={String(g)}>
                          {g} 年級
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.tag}</label>
                    <select
                      value={filters.tag}
                      onChange={(e) => setFilters((p) => ({ ...p, tag: e.target.value, page: 1 }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="ALL">{t.allTags}</option>
                      {['跨域課程', 'EMI全英語授課', '全英語授課', '遠距教學課程', '跨校', '程式設計課程'].map((tg) => (
                        <option key={tg} value={tg}>
                          {tg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.program}</label>
                    <select
                      value={filters.program}
                      onChange={(e) => setFilters((p) => ({ ...p, program: e.target.value, page: 1 }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="ALL">{t.allPrograms}</option>
                      {meta.programs.map((prog) => (
                        <option key={prog.code} value={prog.code}>
                          {lang === 'zh' ? prog.name : prog.name_en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.weekday}</label>
                    <select
                      value={filters.weekday}
                      onChange={(e) => setFilters((p) => ({ ...p, weekday: e.target.value, page: 1 }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="">{t.allWeekdays}</option>
                      {WEEKDAYS.map((w) => (
                        <option key={w} value={String(w)}>
                          {t.weekdays[w]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.matchMode}</label>
                    <select
                      value={filters.matchMode}
                      onChange={(e) => setFilters((p) => ({ ...p, matchMode: e.target.value, page: 1 }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="strict">{t.strictMatch}</option>
                      <option value="flexible">{t.flexibleMatch}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.keyword}</label>
                    <input
                      type="text"
                      value={filters.keyword}
                      onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value, page: 1 }))}
                      placeholder={t.keywordPlaceholder}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                </div>

                {/* Period Bitmask Selector */}
                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-600 mb-1.5">{t.periodFilterLabel}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PERIODS.map((p) => {
                      const active = filters.periods.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePeriodFilter(p)}
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition ${
                            active
                              ? 'bg-[#163a5f] text-white border-[#163a5f]'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {t.periodPrefix}
                          {p}
                          {t.periodSuffix}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hideConflicts}
                      onChange={(e) => setFilters((p) => ({ ...p, hideConflicts: e.target.checked, page: 1 }))}
                      className="rounded border-slate-300"
                    />
                    <span>{t.hideConflicts}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchCourses}
                      className="bg-[#163a5f] hover:bg-[#1f4f80] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                    >
                      {t.searchBtn}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                    >
                      {t.clearBtn}
                    </button>
                  </div>
                </div>
              </section>

              {/* Results Table or Mobile Cards */}
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base">{t.resultsTitle}</h2>
                  <span className="text-xs text-slate-500">
                    {loadingCourses ? '...' : t.totalCount.replace('{n}', String(courseResult.total))}
                  </span>
                </div>

                {activeTab === 'mobile' ? (
                  <div className="space-y-3">
                    {courseResult.items.map((c) => {
                      const isAdded = scheduledIds.has(c.id);
                      const ineligible = !c.eligibility?.eligible;
                      const conflict = isAdded ? null : getScheduleConflict(c);
                      const isCompleted = isCourseCompleted(c);
                      const disabledAdd = ineligible || Boolean(conflict);
                      return (
                        <div
                          key={c.id}
                          className={`rounded-xl border p-3.5 ${
                            disabledAdd ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() => setSelectedCourse(c)}
                                className="text-left font-bold text-[#163a5f] hover:underline text-sm"
                              >
                                {lang === 'zh' ? c.name_zh : c.name_en}
                              </button>
                              {isCompleted && (
                                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                  {t.completedBadge}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded shrink-0">
                              {c.credits} {t.creditsUnit}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{c.code}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="text-[11px] bg-sky-50 text-sky-800 px-2 py-0.5 rounded">{c.category}</span>
                            {c.programs?.map((p) => (
                              <span key={p.code} className="text-[11px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded">
                                {lang === 'zh' ? p.name : p.name_en}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
                            <button onClick={() => setSelectedTeacher(c.teacher || { name: c.teacher_name, name_en: c.teacher_en })} className="text-sky-700 hover:underline">
                              {lang === 'zh' ? c.teacher_name : c.teacher_en}
                            </button>
                            <span>
                              {t.weekdays[c.weekday]} {c.periods} · {c.room}
                            </span>
                          </div>
                          {(ineligible || conflict) && (
                            <div className="mt-2 text-xs text-rose-700 bg-rose-100/70 rounded px-2 py-1 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {ineligible
                                  ? lang === 'zh'
                                    ? c.eligibility.reason_zh
                                    : c.eligibility.reason_en
                                  : lang === 'zh'
                                    ? `與已預排「${conflict.name_zh}」衝堂（${t.weekdays[conflict.weekday]} ${conflict.periods}節）`
                                    : `Conflicts with "${conflict.name_en}" (${t.weekdays[conflict.weekday]} P${conflict.periods})`}
                              </span>
                            </div>
                          )}
                          <div className="mt-3 flex gap-2">
                            {isAdded ? (
                              <button
                                onClick={() => handleRemoveFromSchedule(c.id)}
                                className="flex-1 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-medium"
                              >
                                {t.added}
                              </button>
                            ) : (
                              <button
                                disabled={disabledAdd}
                                onClick={() => handleAddToSchedule(c.id)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
                                  disabledAdd ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#163a5f] text-white'
                                }`}
                              >
                                {ineligible ? t.ineligible : conflict ? t.conflict : t.addCourse}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleCompleted(c)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap ${
                                isCompleted
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {isCompleted ? t.unmarkCompleted : t.markCompleted}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#163a5f] text-white text-xs">
                          <th className="p-2.5 rounded-tl-lg">{t.colCodeName}</th>
                          <th className="p-2.5">{t.colCreditCat}</th>
                          <th className="p-2.5">{t.colTeacher}</th>
                          <th className="p-2.5">{t.colTimeRoom}</th>
                          <th className="p-2.5 rounded-tr-lg text-center">{t.colAction}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {courseResult.items.map((c) => {
                          const isAdded = scheduledIds.has(c.id);
                          const ineligible = !c.eligibility?.eligible;
                          const conflict = isAdded ? null : getScheduleConflict(c);
                          const isCompleted = isCourseCompleted(c);
                          const disabledAdd = ineligible || Boolean(conflict);
                          const conflictTip = conflict
                            ? lang === 'zh'
                              ? `與已預排「${conflict.name_zh}」衝堂（${t.weekdays[conflict.weekday]} ${conflict.periods}節）`
                              : `Conflicts with "${conflict.name_en}" (${t.weekdays[conflict.weekday]} P${conflict.periods})`
                            : '';
                          return (
                            <tr key={c.id} className={disabledAdd ? 'bg-rose-50/70' : 'hover:bg-slate-50'}>
                              <td className="p-2.5 align-top">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    onClick={() => setSelectedCourse(c)}
                                    className="font-semibold text-sky-700 hover:underline text-left"
                                  >
                                    {lang === 'zh' ? c.name_zh : c.name_en}
                                  </button>
                                  {isCompleted && (
                                    <span className="inline-block text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                      {t.completedBadge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400">{c.code}</span>
                                {c.exemption_note_zh && (
                                  <span className="ml-1.5 inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                    {lang === 'en' ? 'Exemptible' : '可抵免'}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 align-top">
                                <div className="text-xs font-medium text-slate-700">
                                  {c.credits} {t.creditsUnit}
                                </div>
                                <span className="inline-block mt-1 text-[11px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
                                  {c.category}
                                </span>
                                {c.programs?.map((p) => (
                                  <span
                                    key={p.code}
                                    className="inline-block mt-1 ml-1 text-[11px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded"
                                  >
                                    {lang === 'zh' ? p.name : p.name_en}
                                  </span>
                                ))}
                              </td>
                              <td className="p-2.5 align-top">
                                <button
                                  onClick={() => setSelectedTeacher(c.teacher || { name: c.teacher_name, name_en: c.teacher_en })}
                                  className="text-sky-700 hover:underline text-xs text-left"
                                >
                                  {lang === 'zh' ? c.teacher_name : c.teacher_en}
                                </button>
                              </td>
                              <td className="p-2.5 align-top text-xs text-slate-600 whitespace-nowrap">
                                <div>
                                  {t.weekdays[c.weekday]} {c.periods}{lang === 'en' ? '' : '節'}
                                </div>
                                <div className="text-slate-400">{c.room}</div>
                              </td>
                              <td className="p-2.5 align-top text-center">
                                <div className="inline-flex flex-col items-center gap-1">
                                  <div className="inline-flex items-center gap-1.5">
                                    {isAdded ? (
                                      <button
                                        onClick={() => handleRemoveFromSchedule(c.id)}
                                        className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-medium whitespace-nowrap"
                                      >
                                        {t.added}
                                      </button>
                                    ) : (
                                      <button
                                        disabled={disabledAdd}
                                        title={conflictTip}
                                        onClick={() => handleAddToSchedule(c.id)}
                                        className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                          disabledAdd
                                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                            : 'bg-[#163a5f] hover:bg-[#1f4f80] text-white'
                                        }`}
                                      >
                                        {ineligible ? t.ineligible : conflict ? t.conflict : t.addCourse}
                                      </button>
                                    )}
                                    {(ineligible || conflict) && (
                                      <button
                                        type="button"
                                        title={
                                          ineligible
                                            ? lang === 'zh'
                                              ? c.eligibility.reason_zh
                                              : c.eligibility.reason_en
                                            : conflictTip
                                        }
                                        onClick={() =>
                                          showToast(
                                            ineligible
                                              ? lang === 'zh'
                                                ? c.eligibility.reason_zh
                                                : c.eligibility.reason_en
                                              : conflictTip,
                                            'error'
                                          )
                                        }
                                        className="text-rose-600 hover:text-rose-800"
                                      >
                                        <Info className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCompleted(c)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap ${
                                      isCompleted
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    {isCompleted ? t.unmarkCompleted : t.markCompleted}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {courseResult.totalPages > 1 && (
                  <div className="mt-3 flex justify-center gap-2">
                    <button
                      disabled={filters.page <= 1}
                      onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                      className="px-2.5 py-1 text-xs rounded border disabled:opacity-40"
                    >
                      上一頁
                    </button>
                    <span className="text-xs py-1 text-slate-600">
                      {filters.page} / {courseResult.totalPages}
                    </span>
                    <button
                      disabled={filters.page >= courseResult.totalPages}
                      onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                      className="px-2.5 py-1 text-xs rounded border disabled:opacity-40"
                    >
                      下一頁
                    </button>
                  </div>
                )}
              </section>
            </div>
            )}

            {/* Right Column / Mobile Stacked: Graduation Progress + Interactive Weekly Timetable */}
            {(activeTab === 'search' || (activeTab === 'mobile' && mobileView === 'schedule')) && (
              <div className={`${activeTab === 'mobile' ? '' : 'lg:col-span-5'} space-y-4`}>
                {/* Graduation Threshold Progress Card */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#163a5f]" />
                      <span>
                        {lang === 'zh'
                          ? includePlannedInGrad
                            ? '畢業門檻進度（已修及格＋預排模擬）'
                            : '畢業門檻進度（確定已修及格）'
                          : 'Graduation Progress (Completed Credits)'}
                      </span>
                    </h2>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includePlannedInGrad}
                          onChange={(e) => setIncludePlannedInGrad(e.target.checked)}
                          className="rounded border-slate-300 text-[#163a5f]"
                        />
                        <span>納入預排課表模擬計算</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowGradSettings((v) => !v)}
                        className="text-xs text-sky-700 hover:underline whitespace-nowrap"
                      >
                        {showGradSettings ? '收合調整' : '額外學分調整'}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-2.5">
                    {includePlannedInGrad ? (
                      <>
                        模擬計算：確定已修（<strong>{gradProgress.completedTotal}</strong> 學分）＋ 預排週課表（
                        <strong>{gradProgress.plannedCredits}</strong> 學分）
                      </>
                    ) : (
                      <>
                        僅統計資料庫確定已修及格（<strong>{gradProgress.completedTotal}</strong> 學分），不含右側預排週課表（
                        {gradProgress.plannedCredits} 學分）
                      </>
                    )}
                  </p>

                  {showGradSettings && (
                    <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="text-[11px] text-slate-600">
                        若尚有未收錄於系統的已修學分，可於此手動微調：
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">額外專業選修</label>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={gradAssume.extraProfElective}
                            onChange={(e) => setGradAssume((p) => ({ ...p, extraProfElective: Number(e.target.value) || 0 }))}
                            className="w-full border rounded px-2 py-1 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">額外一般/通選</label>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={gradAssume.extraGenElective}
                            onChange={(e) => setGradAssume((p) => ({ ...p, extraGenElective: Number(e.target.value) || 0 }))}
                            className="w-full border rounded px-2 py-1 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">額外跨系/跨域</label>
                          <input
                            type="number"
                            min={0}
                            max={30}
                            value={gradAssume.extraCrossDept}
                            onChange={(e) => setGradAssume((p) => ({ ...p, extraCrossDept: Number(e.target.value) || 0 }))}
                            className="w-full border rounded px-2 py-1 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5 text-xs">
                    {[
                      {
                        key: 'all',
                        label: includePlannedInGrad ? '畢業總學分 (已修+預排模擬)' : '畢業總學分 (確定已修及格)',
                        current: gradProgress.total,
                        target: 128,
                        color: 'bg-[#163a5f]'
                      },
                      { key: 'genReq', label: '通識教育必修 (A)', current: gradProgress.genReq, target: 28, color: 'bg-emerald-600' },
                      { key: 'profReq', label: '系所專業必修 (B)', current: gradProgress.profReq, target: 62, color: 'bg-sky-600' },
                      { key: 'profElec', label: '專業選修 (C1：門檻至少19)', current: gradProgress.profElec, target: 19, color: 'bg-indigo-600' },
                      { key: 'genElec', label: '一般 / 通識 / 外系選修 (C2)', current: gradProgress.genElec, target: 19, color: 'bg-violet-600' },
                      { key: 'cross', label: '跨系或跨域課程 (特殊門檻)', current: gradProgress.cross, target: 4, color: 'bg-amber-600' }
                    ].map((bar) => {
                      const pct = Math.min(Math.round((bar.current / bar.target) * 100), 100);
                      const remain = Math.max(bar.target - bar.current, 0);
                      const isExpanded = Boolean(expandedBars[bar.key]);
                      const courseList = gradProgress.lists[bar.key] || [];
                      return (
                        <div key={bar.key}>
                          <div className="flex justify-between items-center mb-1 gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-medium text-slate-700 truncate">{bar.label}</span>
                              <button
                                type="button"
                                onClick={() => toggleBarExpand(bar.key)}
                                className="inline-flex items-center gap-0.5 text-[11px] text-sky-700 hover:text-sky-900 shrink-0"
                                title="展開／收合已修課程明細"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                <span>{isExpanded ? '收合' : '明細'}</span>
                              </button>
                            </div>
                            <span className="text-[11px] text-slate-600 shrink-0">
                              <strong className="text-slate-900">{bar.current}</strong> / {bar.target} 學分{' '}
                              {remain === 0 ? (
                                <span className="text-emerald-700 font-semibold">(已達標 ✓)</span>
                              ) : (
                                <span className="text-rose-600">(尚缺 {remain})</span>
                              )}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${bar.color} transition-all duration-300`} style={{ width: `${pct}%` }} />
                          </div>
                          {isExpanded && (
                            <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700">
                              {courseList.length === 0 ? (
                                <span className="text-slate-400">尚無認列課程</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {courseList.map((item, idx) => (
                                    <span
                                      key={`${bar.key}-${item.code}-${idx}`}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                                        item.isPlanned
                                          ? 'bg-sky-50 border-sky-200 text-sky-800'
                                          : 'bg-white border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <span>{item.name_zh}</span>
                                      <span className="text-slate-400">{item.credits}學分</span>
                                      {item.isPlanned && <span className="text-[10px] text-sky-600">(預排)</span>}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Department Program Threshold (Pick 1 of 2 >= 20 credits) */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-800">
                        系所學程門檻（雙學程擇一修滿 20 學分）
                      </span>
                      {(gradProgress.aiProg >= 20 || gradProgress.medProg >= 20) && (
                        <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          已達標 ✓
                        </span>
                      )}
                    </div>
                    <div className="space-y-2.5 text-xs">
                      {[
                        { key: 'aiProg', label: '人工智慧應用學程', current: gradProgress.aiProg, target: 20, color: 'bg-teal-600' },
                        { key: 'medProg', label: '醫療資訊學程', current: gradProgress.medProg, target: 20, color: 'bg-cyan-600' }
                      ].map((prog) => {
                        const pct = Math.min(Math.round((prog.current / prog.target) * 100), 100);
                        const remain = Math.max(prog.target - prog.current, 0);
                        const isExpanded = Boolean(expandedBars[prog.key]);
                        const courseList = gradProgress.lists[prog.key] || [];
                        return (
                          <div key={prog.key}>
                            <div className="flex justify-between items-center mb-1 gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-medium text-slate-700 truncate">{prog.label}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleBarExpand(prog.key)}
                                  className="inline-flex items-center gap-0.5 text-[11px] text-sky-700 hover:text-sky-900 shrink-0"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  <span>{isExpanded ? '收合' : '查看已修明細'}</span>
                                </button>
                              </div>
                              <span className="text-[11px] text-slate-600 shrink-0">
                                <strong className="text-slate-900">{prog.current}</strong> / {prog.target} 學分{' '}
                                {remain === 0 ? (
                                  <span className="text-emerald-700 font-semibold">(已達標 ✓)</span>
                                ) : (
                                  <span className="text-rose-600">(尚缺 {remain})</span>
                                )}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${prog.color} transition-all duration-300`} style={{ width: `${pct}%` }} />
                            </div>
                            {isExpanded && (
                              <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700">
                                {courseList.length === 0 ? (
                                  <span className="text-slate-400">尚無認列課程</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {courseList.map((item, idx) => (
                                      <span
                                        key={`${prog.key}-${item.code}-${idx}`}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                                          item.isPlanned
                                            ? 'bg-sky-50 border-sky-200 text-sky-800'
                                            : 'bg-white border-slate-200 text-slate-700'
                                        }`}
                                      >
                                        <span>{item.name_zh}</span>
                                        <span className="text-slate-400">{item.credits}學分</span>
                                        {item.isPlanned && <span className="text-[10px] text-sky-600">(預排)</span>}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#163a5f]" />
                      <span>
                        {t.scheduleTitle} ({filters.semester})
                      </span>
                    </h2>
                    <button
                      onClick={handleShareSchedule}
                      className="border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{t.shareSchedule}</span>
                    </button>
                  </div>

                  <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 mb-2">
                    <div className="text-xs sm:text-sm font-bold text-[#163a5f]">
                      {t.creditsSummary.replace('{total}', String(scheduleStats.total))}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {t.creditsDetail
                        .replace('{req}', String(scheduleStats.req))
                        .replace('{elec}', String(scheduleStats.elec))
                        .replace('{left}', String(scheduleStats.left))}
                    </div>
                  </div>

                  <p className="text-xs text-amber-700 mb-3">{t.emptySlotTip}</p>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-center text-[11px]">
                      <thead>
                        <tr className="bg-[#233952] text-white">
                          <th className="p-1.5 border border-slate-300 w-12">{lang === 'en' ? 'Period' : '節次'}</th>
                          {WEEKDAYS.map((w) => (
                            <th key={w} className="p-1.5 border border-slate-300">
                              {t.weekdays[w]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PERIODS.map((p) => (
                          <tr key={p}>
                            <td className="p-1.5 border border-slate-200 bg-slate-50 font-medium text-slate-600">
                              {t.periodPrefix}
                              {p}
                              {t.periodSuffix}
                            </td>
                            {WEEKDAYS.map((w) => {
                              const course = slotLookup[`${w}-${p}`];
                              return (
                                <td key={w} className="p-1 border border-slate-200 h-9 align-middle">
                                  {course ? (
                                    <div className="bg-amber-100 text-amber-900 rounded px-1 py-0.5 flex items-center justify-between gap-1 text-[10px] font-medium">
                                      <span className="truncate">{lang === 'zh' ? course.name_zh : course.name_en}</span>
                                      <button
                                        onClick={() => handleRemoveFromSchedule(course.id)}
                                        className="text-rose-600 hover:text-rose-800 shrink-0"
                                        title="移除"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleEmptySlotClick(w, p)}
                                      className="text-slate-400 hover:text-[#163a5f] hover:bg-sky-50 w-full h-full rounded transition text-[11px]"
                                    >
                                      {t.findCourse}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Admin Import + CRUD */}
        {activeTab === 'admin' && (
          <div className="space-y-5">
            {user?.role !== 'admin' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <ShieldCheck className="w-10 h-10 text-amber-600 mx-auto mb-2" />
                <h2 className="font-bold text-amber-900">需要管理者權限</h2>
                <p className="text-xs text-amber-800 mt-1">請先至「4. 登入與帳號管理」使用管理者帳號（admin01）登入後即可新增、刪除或批次匯入課程。</p>
                <button onClick={() => setActiveTab('auth')} className="mt-3 bg-[#163a5f] text-white px-4 py-1.5 rounded-lg text-xs">
                  前往登入
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <form onSubmit={handleAdminCreate} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <h2 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> 新增開課資料
                  </h2>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <input
                      required
                      placeholder="課程全碼 (例: 221400999)"
                      value={newCourse.code}
                      onChange={(e) => setNewCourse((p) => ({ ...p, code: e.target.value }))}
                      className="border rounded-lg px-2.5 py-1.5"
                    />
                    <input
                      required
                      placeholder="中文課名"
                      value={newCourse.name_zh}
                      onChange={(e) => setNewCourse((p) => ({ ...p, name_zh: e.target.value }))}
                      className="border rounded-lg px-2.5 py-1.5"
                    />
                    <input
                      placeholder="英文課名"
                      value={newCourse.name_en}
                      onChange={(e) => setNewCourse((p) => ({ ...p, name_en: e.target.value }))}
                      className="border rounded-lg px-2.5 py-1.5"
                    />
                    <input
                      required
                      placeholder="授課教師"
                      value={newCourse.teacher_name}
                      onChange={(e) => setNewCourse((p) => ({ ...p, teacher_name: e.target.value }))}
                      className="border rounded-lg px-2.5 py-1.5"
                    />
                    <input
                      placeholder="節次 (例: 3,4)"
                      value={newCourse.periods}
                      onChange={(e) => setNewCourse((p) => ({ ...p, periods: e.target.value }))}
                      className="border rounded-lg px-2.5 py-1.5"
                    />
                    <input
                      placeholder="教室 (例: F601)"
                      value={newCourse.room}
                      onChange={(e) => setNewCourse((p) => ({ ...p, room: e.target.value }))}
                      className="border rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <button type="submit" className="bg-[#163a5f] text-white px-4 py-1.5 rounded-lg text-xs font-medium">
                    儲存課程
                  </button>
                </form>

                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <h2 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4" /> JSON 批次匯入開課資料
                  </h2>
                  <textarea
                    rows={4}
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    placeholder='[{"code":"221408888","name_zh":"智慧醫療導論","teacher_name":"連中岳","weekday":4,"periods":"5,6","room":"F601"}]'
                    className="w-full border rounded-lg p-2 text-xs font-mono"
                  />
                  <button onClick={handleAdminImport} className="bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium">
                    執行匯入
                  </button>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="font-bold text-slate-800 text-sm">
                      現有課程管理列表 <span className="text-xs font-normal text-slate-500">（共 {courseResult.total} 筆）</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <select
                        value={filters.semester}
                        onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value, page: 1 }))}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="ALL">全部學期</option>
                        {meta.semesters.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={filters.keyword}
                        onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value, page: 1 }))}
                        placeholder="搜尋課名、課號或教師..."
                        className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs w-48"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {courseResult.items.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs border-b border-slate-200 py-2">
                        <div>
                          <span className="font-bold">{c.name_zh}</span>{' '}
                          <span className="text-slate-400">({c.code})</span> · {c.semester} · {c.teacher_name}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingCourse({ ...c })}
                            className="text-sky-700 hover:underline font-medium"
                          >
                            編輯
                          </button>
                          <button onClick={() => handleAdminDelete(c.id)} className="text-rose-600 hover:text-rose-800 flex items-center gap-1">
                            <Trash2 className="w-3.5 h-3.5" /> 刪除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {courseResult.totalPages > 1 && (
                    <div className="mt-3 flex justify-center items-center gap-2">
                      <button
                        disabled={filters.page <= 1}
                        onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                        className="px-2.5 py-1 text-xs rounded border border-slate-300 disabled:opacity-40"
                      >
                        {lang === 'en' ? 'Prev' : '上一頁'}
                      </button>
                      <span className="text-xs text-slate-600">
                        {filters.page} / {courseResult.totalPages}
                      </span>
                      <button
                        disabled={filters.page >= courseResult.totalPages}
                        onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                        className="px-2.5 py-1 text-xs rounded border border-slate-300 disabled:opacity-40"
                      >
                        {lang === 'en' ? 'Next' : '下一頁'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Login & Account */}
        {activeTab === 'auth' && (
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-lg text-slate-800 mb-1">
              {authMode === 'login' ? '登入系統' : '註冊學生帳號'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {authMode === 'login' ? '登入後可使用個人預排課表、資格預審與管理者功能' : '建立測試學生帳號'}
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">帳號</label>
                <input
                  required
                  value={authForm.username}
                  onChange={(e) => setAuthForm((p) => ({ ...p, username: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">密碼</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={authForm.password}
                    onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">姓名</label>
                    <input
                      required
                      value={authForm.name}
                      onChange={(e) => setAuthForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">年級</label>
                    <select
                      value={authForm.grade}
                      onChange={(e) => setAuthForm((p) => ({ ...p, grade: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {[1, 2, 3, 4].map((g) => (
                        <option key={g} value={g}>
                          {lang === 'en' ? `Year ${g}` : `${g} 年級`}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button type="submit" className="w-full bg-[#163a5f] hover:bg-[#1f4f80] text-white py-2 rounded-lg font-medium text-sm">
                {authMode === 'login' ? '登入' : '註冊並登入'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-600">
              <button onClick={() => setAuthMode((m) => (m === 'login' ? 'register' : 'login'))} className="text-sky-700 hover:underline">
                {authMode === 'login' ? '沒有帳號？點此註冊學生帳號' : '已有帳號？返回登入'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Admin Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={handleAdminUpdate} className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="font-bold text-base text-[#163a5f]">
                編輯課程：{editingCourse.name_zh} ({editingCourse.code})
              </h3>
              <button type="button" onClick={() => setEditingCourse(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">中文課名</label>
                <input
                  required
                  value={editingCourse.name_zh || ''}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, name_zh: e.target.value }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">英文課名</label>
                <input
                  value={editingCourse.name_en || ''}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, name_en: e.target.value }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">授課教師</label>
                <input
                  required
                  value={editingCourse.teacher_name || ''}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, teacher_name: e.target.value }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">學分數</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={editingCourse.credits ?? 2}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, credits: Number(e.target.value) || 0 }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">星期 (1-7)</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={editingCourse.weekday ?? 1}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, weekday: Number(e.target.value) || 1 }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">節次 (例: 5,6,7)</label>
                <input
                  value={editingCourse.periods || ''}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, periods: e.target.value }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">教室</label>
                <input
                  value={editingCourse.room || ''}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, room: e.target.value }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">最低修課年級</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={editingCourse.min_grade ?? 1}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, min_grade: Number(e.target.value) || 1 }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>
            <div className="text-xs">
              <label className="block text-[11px] text-slate-500 mb-0.5">修課限制說明</label>
              <input
                value={editingCourse.restriction_note_zh || ''}
                onChange={(e) => setEditingCourse((p) => ({ ...p, restriction_note_zh: e.target.value }))}
                className="w-full border rounded-lg px-2.5 py-1.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingCourse(null)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs">
                取消
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-[#163a5f] text-white text-xs font-medium">
                儲存變更
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-[#163a5f]">
                  {lang === 'zh' ? selectedCourse.name_zh : selectedCourse.name_en}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCourse.code} · {selectedCourse.credits} {t.creditsUnit} · {selectedCourse.category}
                </p>
              </div>
              <button onClick={() => setSelectedCourse(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs space-y-2 text-slate-700 border-t pt-3">
              <div>
                <span className="font-semibold">上課時間與地點：</span>
                {t.weekdays[selectedCourse.weekday]} 第 {selectedCourse.periods} 節 · {selectedCourse.room}
              </div>
              <div>
                <span className="font-semibold">教學計畫摘要：</span>
                {lang === 'zh' ? selectedCourse.syllabus_summary_zh : selectedCourse.syllabus_summary_en}
              </div>
              {selectedCourse.restriction_note_zh && (
                <div className="bg-slate-50 p-2 rounded">
                  <span className="font-semibold">修課限制：</span>
                  {lang === 'zh' ? selectedCourse.restriction_note_zh : selectedCourse.restriction_note_en}
                </div>
              )}
              {selectedCourse.exemption_note_zh && (
                <div className="bg-amber-50 text-amber-900 p-2 rounded">
                  <span className="font-semibold">證照／考試抵免辦法：</span>
                  {lang === 'zh' ? selectedCourse.exemption_note_zh : selectedCourse.exemption_note_en}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Teacher Info Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-[#163a5f]">
                  {selectedTeacher.name} {selectedTeacher.title || ''}
                </h3>
                <p className="text-xs text-slate-500">{selectedTeacher.name_en}</p>
              </div>
              <button onClick={() => setSelectedTeacher(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs space-y-1.5 text-slate-700 border-t pt-3">
              {selectedTeacher.department && <div>所屬系所：{selectedTeacher.department}</div>}
              {selectedTeacher.email && <div>Email：{selectedTeacher.email}</div>}
              {selectedTeacher.ext && <div>校內分機：{selectedTeacher.ext}</div>}
              {selectedTeacher.expertise && <div>學術專長：{selectedTeacher.expertise}</div>}
              {selectedTeacher.lab && <div>實驗室：{selectedTeacher.lab}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Share Schedule Modal */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-[#163a5f] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 已產生課表分享連結
              </h3>
              <button onClick={() => setShareUrl('')} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">此連結僅包含課程清單，已自動去除學號與姓名等個人隱私資料：</p>
            <input readOnly value={shareUrl} className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-slate-50" />
            <button
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                showToast('已複製連結', 'success');
              }}
              className="w-full bg-[#163a5f] text-white py-1.5 rounded-lg text-xs font-medium"
            >
              複製連結
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
