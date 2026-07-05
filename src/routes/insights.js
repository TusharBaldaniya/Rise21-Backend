import express from 'express';
import prisma from '../prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper to get date string YYYY-MM-DD for a Date object
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Fetch active challenges count
    const activeChallengesCount = await prisma.challenge.count({
      where: { userId, isActive: true }
    });

    // 2. Fetch all checkins
    const allCheckIns = await prisma.dailyCheckIn.findMany({
      where: { userId },
      include: { challenge: true },
      orderBy: { date: 'asc' }
    });

    // 3. Fetch all wallet transactions for total penalty sum
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId, type: 'charge' }
    });
    const totalPenalty = transactions.reduce((sum, t) => sum + t.amount, 0);

    // --- Streak & Success Calculations ---
    // Group check-ins by date
    const checkinsByDate = {};
    allCheckIns.forEach(c => {
      if (!checkinsByDate[c.date]) {
        checkinsByDate[c.date] = { completed: 0, missed: 0 };
      }
      if (c.status === 'completed') {
        checkinsByDate[c.date].completed++;
      } else {
        checkinsByDate[c.date].missed++;
      }
    });

    // Calculate streaks
    // A successful day is one where there is at least one checkin and 0 misses.
    const sortedDates = Object.keys(checkinsByDate).sort();
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Calculate streaks by traversing sorted dates
    // To identify consecutive days, we convert date strings back to timestamp offsets
    let lastDateTime = null;
    const msInDay = 24 * 60 * 60 * 1000;

    sortedDates.forEach(dateStr => {
      const dayData = checkinsByDate[dateStr];
      const isDaySuccessful = dayData.completed > 0 && dayData.missed === 0;

      if (isDaySuccessful) {
        const currentDate = new Date(dateStr + 'T00:00:00');
        if (lastDateTime === null) {
          tempStreak = 1;
        } else {
          const diffTime = Math.abs(currentDate - lastDateTime);
          const diffDays = Math.round(diffTime / msInDay);

          if (diffDays === 1) {
            tempStreak++;
          } else if (diffDays > 1) {
            tempStreak = 1;
          }
        }
        lastDateTime = currentDate;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
        lastDateTime = null;
      }
    });

    // Calculate current streak (ending at today or yesterday)
    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    let streakActive = false;
    let checkDateStr = todayStr;

    // If today is a success or yesterday was a success, count backwards to find current streak
    if (checkinsByDate[todayStr] && checkinsByDate[todayStr].completed > 0 && checkinsByDate[todayStr].missed === 0) {
      streakActive = true;
      checkDateStr = todayStr;
    } else if (checkinsByDate[yesterdayStr] && checkinsByDate[yesterdayStr].completed > 0 && checkinsByDate[yesterdayStr].missed === 0) {
      streakActive = true;
      checkDateStr = yesterdayStr;
    }

    if (streakActive) {
      let streakCount = 0;
      let curr = new Date(checkDateStr + 'T00:00:00');
      while (true) {
        const currStr = getLocalDateString(curr);
        const data = checkinsByDate[currStr];
        if (data && data.completed > 0 && data.missed === 0) {
          streakCount++;
          curr.setDate(curr.getDate() - 1);
        } else {
          break;
        }
      }
      currentStreak = streakCount;
    } else {
      currentStreak = 0;
    }

    // Success Rate
    const totalCheckinsCount = allCheckIns.length;
    const completedCheckinsCount = allCheckIns.filter(c => c.status === 'completed').length;
    const successRate = totalCheckinsCount > 0 ? Math.round((completedCheckinsCount / totalCheckinsCount) * 100) : 0;

    // --- Last 7 Days chart data ---
    const last7DaysData = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayName = weekdays[d.getDay()];
      const stats = checkinsByDate[dateStr] || { completed: 0, missed: 0 };
      
      let rate = 0;
      const total = stats.completed + stats.missed;
      if (total > 0) {
        rate = Math.round((stats.completed / total) * 100);
      }

      last7DaysData.push({
        day: dayName,
        date: dateStr,
        completed: stats.completed,
        missed: stats.missed,
        rate
      });
    }

    // --- Most Missed Habits ---
    const missedCounts = {};
    allCheckIns.forEach(c => {
      if (c.status === 'missed') {
        const title = c.challenge.title;
        missedCounts[title] = (missedCounts[title] || 0) + 1;
      }
    });

    const mostMissed = Object.keys(missedCounts)
      .map(title => ({ name: title, count: missedCounts[title] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // --- Achievements badges validation ---
    const achievements = [];
    
    // First step
    if (completedCheckinsCount > 0) {
      achievements.push({
        id: 'first_step',
        title: 'First Step',
        description: 'Completed your first daily checklist.',
        icon: '🔥'
      });
    }

    // 7 Day Streak
    if (bestStreak >= 7) {
      achievements.push({
        id: 'streak_7',
        title: '7-Day Streak',
        description: 'Maintained discipline for 7 days straight.',
        icon: '💪'
      });
    }

    // 21 Day Master (Check if any challenge of duration >= 21 has ended or has >= 21 completed checkins)
    const challenges = await prisma.challenge.findMany({
      where: { userId },
      include: { checkIns: true }
    });

    const has21DayCompleted = challenges.some(ch => {
      const completedCount = ch.checkIns.filter(ci => ci.status === 'completed').length;
      return ch.durationDays >= 21 && completedCount >= 21;
    });

    if (has21DayCompleted) {
      achievements.push({
        id: 'master_21',
        title: '21-Day Master',
        description: 'Completed a full 21-day challenge successfully.',
        icon: '🏆'
      });
    }

    // Discipline Master (streak of 14 days or completed challenge with 100% success rate and at least 7 checkins)
    const hasPerfectChallenge = challenges.some(ch => {
      const totalCount = ch.checkIns.length;
      const completedCount = ch.checkIns.filter(ci => ci.status === 'completed').length;
      return totalCount >= 7 && completedCount === totalCount;
    });

    if (bestStreak >= 14 || hasPerfectChallenge) {
      achievements.push({
        id: 'discipline_master',
        title: 'Discipline Master',
        description: 'Demonstrated outstanding habit control and self-discipline.',
        icon: '🌟'
      });
    }

    res.json({
      bestStreak,
      currentStreak,
      successRate,
      activeChallengesCount,
      totalPenalty,
      last7Days: last7DaysData,
      mostMissed,
      achievements
    });
  } catch (error) {
    console.error('Insights calculation error:', error);
    res.status(500).json({ error: 'Could not calculate insights.' });
  }
});

export default router;
