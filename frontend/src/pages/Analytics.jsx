import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  BookOpen, 
  TrendingUp, 
  Award,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  Zap,
  BarChart3
} from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";

const Analytics = () => {
  const { sidebarCollapsed } = useSidebar();
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [tasks, setTasks] = useState({});
  const [newTask, setNewTask] = useState("");
  const [streak, setStreak] = useState(0);
  const [activeTab, setActiveTab] = useState("courses");

  const statusEmojis = {
    Completed: "✅",
    Ongoing: "🔄",
    Upcoming: "📅",
  };

  const statusIcons = {
    Completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    Ongoing: <Clock className="w-4 h-4 text-yellow-500" />,
    Upcoming: <AlertCircle className="w-4 h-4 text-gray-400" />,
  };

  const formatDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // Fetch courses and analytics
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found in localStorage; skipping analytics fetch.");
          setCourses([]);
          setStudySessions([]);
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const coursesRes = await fetch("/api/courses", { headers });
        const analyticsRes = await fetch("/api/analytics", { headers });

        if (!coursesRes.ok) {
          console.error("Failed to fetch courses:", coursesRes.status, coursesRes.statusText);
          setCourses([]);
        } else {
          const coursesData = await coursesRes.json();
          setCourses(coursesData);
        }

        if (!analyticsRes.ok) {
          console.error("Failed to fetch analytics:", analyticsRes.status, analyticsRes.statusText);
          setStudySessions([]);
        } else {
          let analyticsData;
          try {
            analyticsData = await analyticsRes.json();
          } catch (parseError) {
            console.error("Failed to parse analytics response as JSON:", parseError);
            setStudySessions([]);
            return;
          }
          setStudySessions(analyticsData.studySessions || []);
        }
      } catch (err) {
        console.error("Unexpected error while fetching analytics data:", err);
        setCourses([]);
        setStudySessions([]);
      }
    };

    if (user) fetchData();
  }, [user]);

  // Streak calculation
  useEffect(() => {
    const todayStr = new Date().toDateString();
    const lastLoginStr = localStorage.getItem("lastLogin");
    let currentStreak = parseInt(localStorage.getItem("streak")) || 0;

    if (lastLoginStr !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastLoginStr === yesterday.toDateString()) currentStreak += 1;
      else currentStreak = 1;

      localStorage.setItem("streak", currentStreak);
      localStorage.setItem("lastLogin", todayStr);
      setStreak(currentStreak);
    } else setStreak(currentStreak);
  }, []);

  // Load tasks
  useEffect(() => {
    const saved = localStorage.getItem("calendarTasks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure we only set an object; otherwise fall back to empty object
        setTasks(parsed && typeof parsed === "object" ? parsed : {});
      } catch (error) {
        // If the stored data is corrupted, remove it and fall back to an empty object
        console.error("Failed to parse calendarTasks from localStorage:", error);
        localStorage.removeItem("calendarTasks");
        setTasks({});
      }
    }
    setSelectedDate(formatDateKey(new Date()));
  }, []);

  useEffect(() => {
    localStorage.setItem("calendarTasks", JSON.stringify(tasks));
  }, [tasks]);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const totalCourses = user?.purchasedCourses?.length || 0;

  const certificates =
    user?.purchasedCourses?.filter((course) => {
      const courseInfo = courses.find((c) => c.id == course.courseId);
      const totalLessons = courseInfo?.lessonsCount || 0;
      const completedLessons = course.progress?.completedLessons?.length || 0;
      return totalLessons > 0 && completedLessons === totalLessons;
    }).length || 0;

  const calculateAttendance = () => {
    const today = new Date();
    const last30 = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      last30.push(d.toDateString());
    }
    const studiedDays = studySessions.map((s) =>
      new Date(s.date).toDateString(),
    );
    const uniqueDays = [...new Set(studiedDays)];
    const attended = uniqueDays.filter((d) => last30.includes(d)).length;
    return Math.round((attended / 30) * 100);
  };

  const attendance = calculateAttendance();

  const addTask = () => {
    if (!newTask.trim()) return;
    const dateKey = selectedDate || formatDateKey(new Date());
    setTasks((prev) => ({
      ...prev,
      [dateKey]: [
        ...(prev[dateKey] || []),
        { text: newTask.trim(), status: "Upcoming" },
      ],
    }));
    setNewTask("");
  };

  const updateTaskStatus = (index, status) => {
    if (!tasks[selectedDate]) return;
    setTasks((prev) => {
      const updated = [...prev[selectedDate]];
      updated[index].status = status;
      return { ...prev, [selectedDate]: updated };
    });
  };

  const deleteTask = (index) => {
    setTasks((prev) => {
      if (!prev[selectedDate]) return prev;
      const updated = [...prev[selectedDate]];
      updated.splice(index, 1);
      return { ...prev, [selectedDate]: updated };
    });
  };

  const generateCalendarGrid = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = [];
    let day = 1;
    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) week.push(null);
        else if (day > daysInMonth) week.push(null);
        else {
          week.push(day);
          day++;
        }
      }
      grid.push(week);
    }
    return grid;
  };

  const calendarGrid = generateCalendarGrid(currentDate);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const getDateKey = (day) =>
    formatDateKey(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
    );

  const myCourses =
    user?.purchasedCourses?.map((c) => {
      const courseInfo = courses.find((course) => course.id == c.courseId);
      const completedLessons = c.progress?.completedLessons?.length || 0;
      const totalLessons = courseInfo?.lessonsCount || 0;
      const rawProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const progress = Math.max(0, Math.min(100, rawProgress));
      const remaining = Math.max(0, totalLessons - completedLessons);
      return {
        id: c.courseId,
        title: courseInfo?.title || "Course",
        level: courseInfo?.level || "Beginner",
        image: courseInfo?.image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
        category: courseInfo?.category || "Education",
        completedLessons,
        totalLessons,
        progress,
        remaining,
      };
    }) || [];

  // Filter courses based on search
  const filteredCourses = myCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total study time
  const totalStudyTime = studySessions.reduce((acc, session) => acc + (session.duration || 0), 0);
  const averageProgress = myCourses.length > 0 
    ? Math.round(myCourses.reduce((acc, c) => acc + c.progress, 0) / myCourses.length) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <Header/>

      <Sidebar activePage="analytics" />

      <div
        className={`flex-1 transition-all duration-300 mt-16 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-80"
        }`}
      >
        <main className="p-4 md:p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-main">
              Welcome back, {user?.name || 'Learner'}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              Here's your learning progress and upcoming tasks
            </p>
          </div>

          {/* METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                label: "Enrolled Courses",
                value: totalCourses,
                icon: <BookOpen className="w-6 h-6 text-indigo-600" />,
                color: "from-indigo-500 to-indigo-600",
                bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
                trend: totalCourses > 0 ? `${myCourses.filter(c => c.progress > 0).length} in progress` : 'Start learning!'
              },
              {
                label: "Attendance Rate",
                value: `${attendance}%`,
                icon: <BarChart3 className="w-6 h-6 text-green-600" />,
                color: "from-green-500 to-green-600",
                bgColor: "bg-green-50 dark:bg-green-900/20",
                trend: attendance > 70 ? '👍 Great consistency' : '👀 Needs improvement'
              },
              {
                label: "Current Streak",
                value: `${streak} ${streak > 0 ? '🔥' : '📅'}`,
                icon: <Zap className="w-6 h-6 text-yellow-600" />,
                color: "from-yellow-500 to-yellow-600",
                bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
                trend: streak > 0 ? `${streak} day${streak > 1 ? 's' : ''} streak!` : 'Start your streak today!'
              },
              {
                label: "Certificates",
                value: certificates,
                icon: <Award className="w-6 h-6 text-purple-600" />,
                color: "from-purple-500 to-purple-600",
                bgColor: "bg-purple-50 dark:bg-purple-900/20",
                trend: certificates > 0 ? '🎉 Achievements unlocked' : 'Complete courses to earn'
              },
            ].map((metric, idx) => (
              <div
                key={idx}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{metric.label}</p>
                    <p className={`text-3xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                      {metric.value}
                    </p>
                  </div>
                  <div className={`${metric.bgColor} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                    {metric.icon}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>{metric.trend}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Average Progress</div>
              <div className="text-xl font-bold text-indigo-600">{averageProgress}%</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${averageProgress}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Completed Lessons</div>
              <div className="text-xl font-bold text-green-600">
                {myCourses.reduce((acc, c) => acc + c.completedLessons, 0)}
              </div>
              <div className="text-xs text-gray-400 mt-2">Across all courses</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Total Study Time</div>
              <div className="text-xl font-bold text-purple-600">
                {Math.round(totalStudyTime / 60)} hrs
              </div>
              <div className="text-xs text-gray-400 mt-2">All time</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Upcoming Tasks</div>
              <div className="text-xl font-bold text-yellow-600">
                {Object.values(tasks).flat().filter(t => t.status === "Upcoming").length}
              </div>
              <div className="text-xs text-gray-400 mt-2">Need attention</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab("courses")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "courses"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              My Courses
              {activeTab === "courses" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "calendar"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Calendar & Tasks
              {activeTab === "calendar" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></span>
              )}
            </button>
          </div>

          {activeTab === "courses" && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                  My Courses
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {filteredCourses.length}
                  </span>
                </h2>
                <Link
                  to="/courses"
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  Browse All Courses
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Level</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredCourses.length > 0 ? (
                        filteredCourses.map((course) => (
                          <tr 
                            key={course.id} 
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <Link to={`/learning/${course.id}`} className="flex items-center gap-4">
                                <div className="relative">
                                  <img 
                                    src={course.image} 
                                    alt={course.title} 
                                    className="w-12 h-12 rounded-xl object-cover group-hover:scale-105 transition-transform duration-300" 
                                  />
                                  <div className="absolute inset-0 rounded-xl bg-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                                    {course.title}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                                      {course.category}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {course.remaining} lessons left
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-40">
                                <div className="flex justify-between mb-1">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {course.progress}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 relative"
                                    style={{ width: `${course.progress}%` }}
                                  >
                                    <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-semibold text-indigo-600">{course.completedLessons}</span>
                                  <span className="mx-1 text-gray-300">/</span>
                                  <span>{course.totalLessons}</span>
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                                course.level === 'Beginner' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : course.level === 'Intermediate' 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              }`}>
                                {course.level}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                to={`/learning/${course.id}`}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                              >
                                Continue
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <BookOpen className="w-12 h-12 text-gray-300" />
                              <p className="text-gray-500">
                                {searchQuery ? 'No courses match your search' : 'No courses enrolled yet.'}
                              </p>
                              {!searchQuery && (
                                <Link 
                                  to="/courses" 
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                >
                                  Browse Courses
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CALENDAR */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                {/* Month Navigation */}
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600" />
                  </button>
                  <span className="text-xl font-bold text-gray-800 dark:text-gray-200">
                    {currentDate.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600" />
                  </button>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarGrid.flat().map((day, index) => {
                    if (!day) return <div key={index} className="h-24 bg-gray-50 dark:bg-gray-800/50 rounded-xl" />;
                    const key = getDateKey(day);
                    const isToday = key === formatDateKey(new Date());
                    const taskList = tasks[key] || [];
                    const displayTasks = taskList.slice(0, 2);
                    const remainingCount = Math.max(taskList.length - displayTasks.length, 0);
                    const completedCount = taskList.filter(t => t.status === "Completed").length;
                    const progress = taskList.length > 0 ? (completedCount / taskList.length) * 100 : 0;

                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedDate(key)}
                        className={`relative h-24 rounded-xl p-2 cursor-pointer transition-all duration-300
                          ${selectedDate === key 
                            ? 'ring-2 ring-indigo-500 shadow-lg scale-105 z-10' 
                            : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600'
                          }
                          ${isToday 
                            ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-400' 
                            : taskList.length > 0 && completedCount === taskList.length
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30'
                            : 'bg-white dark:bg-gray-800'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-sm font-semibold ${
                            isToday ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {day}
                          </span>
                          {taskList.length > 0 && (
                            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 rounded-full">
                              {taskList.length}
                            </span>
                          )}
                        </div>
                        
                        {taskList.length > 0 && (
                          <>
                            <div className="mt-1 space-y-0.5">
                              {displayTasks.map((task, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-[10px]">
                                  <span>{statusEmojis[task.status]}</span>
                                  <span className="truncate text-gray-600 dark:text-gray-400">{task.text}</span>
                                </div>
                              ))}
                              {remainingCount > 0 && (
                                <div className="text-[9px] text-gray-500 dark:text-gray-500">
                                  +{remainingCount} more
                                </div>
                              )}
                            </div>
                            
                            {/* Progress indicator */}
                            {taskList.length > 1 && (
                              <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-50 to-emerald-50"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">All Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔄</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Ongoing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Upcoming</span>
                  </div>
                </div>
              </div>

              {/* TASK PANEL */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Tasks for {selectedDate}
                  </h3>
                </div>

                <div className="flex gap-2 mb-6">
  <input
    value={newTask}
    onChange={(e) => setNewTask(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && addTask()}
    className="w-[65%] border dark:border-gray-700 dark:bg-gray-900 dark:text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
    placeholder="Add a new task..."
  />

  <button
    onClick={addTask}
    className="w-[35%] bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl transition flex items-center justify-center gap-1"
  >
    <Plus className="w-4 h-4" />
    Add
  </button>
</div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(tasks[selectedDate] || []).length > 0 ? (
                    (tasks[selectedDate] || []).map((task, i) => (
                      <div
                        key={i}
                        className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all
                          ${task.status === "Completed" 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className="flex-shrink-0">
                          {statusIcons[task.status]}
                        </div>
                        <span className={`flex-1 text-sm line-clamp-2 ${
                          task.status === "Completed" 
                            ? 'line-through text-gray-500 dark:text-gray-400' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {task.text}
                        </span>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(i, e.target.value)}
                            className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg p-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="Upcoming">📅 Upcoming</option>
                            <option value="Ongoing">🔄 Ongoing</option>
                            <option value="Completed">✅ Done</option>
                          </select>
                          <button
                            onClick={() => deleteTask(i)}
                            className="text-gray-400 hover:text-red-500 transition p-1"
                            aria-label="Delete task"
                            title="Delete task"
                          >
                            ✕
                          </button>
                        </div>

                        {task.status === "Completed" && (
                          <div className="absolute bottom-0 left-0 h-0.5 bg-green-500 rounded-full w-full"></div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                        <Target className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks for this day</p>
                      <p className="text-xs text-gray-400 mt-1">Add a task to get started</p>
                    </div>
                  )}
                </div>

                {/* Task summary */}
                {tasks[selectedDate] && tasks[selectedDate].length > 0 && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Completed:</span>
                      <span className="font-medium text-green-600">
                        {tasks[selectedDate].filter(t => t.status === "Completed").length}/{tasks[selectedDate].length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(tasks[selectedDate].filter(t => t.status === "Completed").length / tasks[selectedDate].length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default Analytics;