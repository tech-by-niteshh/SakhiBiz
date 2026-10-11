/**
 * SakhiBiz — Google Apps Script CMS & Email Gateway
 * Target: Google Sheets + Google Apps Script Web App
 * 
 * Deployment Instructions:
 * 1. Open Google Sheets -> Extensions -> Apps Script.
 * 2. Paste this code into Code.gs.
 * 3. Go to Project Settings (Gear icon) -> Script Properties:
 *    Add property: APPS_SCRIPT_SHARED_SECRET = <your-chosen-secret-token>
 * 4. Click Deploy -> New deployment -> Select type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone (The script validates the shared secret on every request).
 * 5. Copy the Web App URL and set it as APPS_SCRIPT_URL in your Vercel / .env environment variables.
 */

// Tab definitions and schema headers
var TABS = {
  USERS: {
    name: 'Users',
    headers: ['userId', 'normalizedEmail', 'registeredAt', 'accountStatus', 'emailVerified']
  },
  COURSES: {
    name: 'Courses',
    headers: ['courseId', 'title', 'description', 'category', 'language', 'thumbnailUrl', 'published', 'createdAt', 'updatedAt', 'createdBy']
  },
  LESSONS: {
    name: 'Lessons',
    headers: ['lessonId', 'courseId', 'title', 'description', 'order', 'driveFileId', 'videoUrl', 'duration', 'published']
  },
  ENROLLMENTS: {
    name: 'Enrollments',
    headers: ['enrollmentId', 'userId', 'normalizedEmail', 'courseId', 'enrolledAt', 'status']
  },
  EMAIL_LOGS: {
    name: 'EmailLogs',
    headers: ['emailLogId', 'campaignId', 'recipientEmail', 'status', 'sentAt', 'errorMessage']
  },
  ACTIVITY_LOGS: {
    name: 'ActivityLogs',
    headers: ['eventId', 'actorUserId', 'actorRole', 'action', 'targetId', 'timestamp']
  }
};

/**
 * Initialize or verify required sheets and header rows
 */
function ensureSheetsStructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var key in TABS) {
    var tabInfo = TABS[key];
    var sheet = ss.getSheetByName(tabInfo.name);
    if (!sheet) {
      sheet = ss.insertSheet(tabInfo.name);
      sheet.appendRow(tabInfo.headers);
      sheet.setFrozenRows(1);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(tabInfo.headers);
      sheet.setFrozenRows(1);
    }
  }
}

/**
 * Web App GET Entry Point (Health Check & Diagnostics)
 */
function doGet(e) {
  return jsonResponse({
    success: true,
    message: 'SakhiBiz Google Apps Script Web App Gateway is active.',
    timestamp: new Date().toISOString()
  });
}

/**
 * Main Web App POST Entry Point
 */
function doPost(e) {
  try {
    ensureSheetsStructure();

    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        return jsonResponse({ success: false, error: 'Malformed JSON payload: ' + jsonErr.toString() });
      }
    } else {
      return jsonResponse({ success: false, error: 'Empty request payload' });
    }

    // Authenticate shared secret against Script Properties
    var configuredSecret = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_SHARED_SECRET');
    if (!configuredSecret) {
      return jsonResponse({
        success: false,
        error: 'APPS_SCRIPT_SHARED_SECRET not configured in Script Properties.'
      });
    }

    if (!requestData.secret || requestData.secret !== configuredSecret) {
      return jsonResponse({ success: false, error: 'Unauthorized: Shared secret mismatch.' });
    }

    var action = requestData.action;
    var payload = requestData.payload || {};

    switch (action) {
      case 'ping':
        return jsonResponse({ success: true, message: 'SakhiBiz Apps Script Online', timestamp: new Date().toISOString() });

      case 'syncUser':
        return handleSyncUser(payload);

      case 'listCourses':
        return handleListCourses(payload);

      case 'getCourse':
        return handleGetCourse(payload);

      case 'createCourse':
        return handleCreateCourse(payload);

      case 'updateCourse':
        return handleUpdateCourse(payload);

      case 'deleteCourse':
        return handleDeleteCourse(payload);

      case 'createLesson':
        return handleCreateLesson(payload);

      case 'updateLesson':
        return handleUpdateLesson(payload);

      case 'deleteLesson':
        return handleDeleteLesson(payload);

      case 'recordEnrollment':
        return handleRecordEnrollment(payload);

      case 'previewEmail':
        return handlePreviewEmail(payload);

      case 'sendEmailAnnouncement':
        return handleSendEmail(payload);

      case 'getEmailLogs':
        return handleGetEmailLogs();

      case 'logActivity':
        return handleLogActivity(payload);

      case 'getActivityLogs':
        return handleGetActivityLogs();

      case 'getStats':
        return handleGetStats();

      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Handle syncUser (Register/Update user in Users sheet)
 */
function handleSyncUser(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.USERS.name);
  var data = sheet.getDataRange().getValues();

  var email = (p.normalizedEmail || '').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'normalizedEmail required' });

  var existingRowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().toLowerCase().trim() === email) {
      existingRowIndex = i + 1;
      break;
    }
  }

  var rowValues = [
    p.userId || '',
    email,
    p.registeredAt || new Date().toISOString(),
    p.accountStatus || 'ACTIVE',
    p.emailVerified ? true : false
  ];

  if (existingRowIndex > 0) {
    sheet.getRange(existingRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    return jsonResponse({ success: true, updated: true, userId: p.userId });
  } else {
    sheet.appendRow(rowValues);
    return jsonResponse({ success: true, inserted: true, userId: p.userId });
  }
}

/**
 * Handle listCourses
 */
function handleListCourses(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.COURSES.name);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ success: true, courses: [] });

  var includeUnpublished = !!p.includeUnpublished;
  var courses = [];

  for (var i = 1; i < data.length; i++) {
    var isPub = data[i][6] === true || data[i][6] === 'true' || data[i][6] === 1;
    if (!includeUnpublished && !isPub) continue;

    courses.push({
      courseId: data[i][0],
      title: data[i][1],
      description: data[i][2],
      category: data[i][3],
      language: data[i][4],
      thumbnailUrl: data[i][5],
      published: isPub,
      createdAt: data[i][7],
      updatedAt: data[i][8],
      createdBy: data[i][9]
    });
  }

  return jsonResponse({ success: true, courses: courses });
}

/**
 * Handle getCourse
 */
function handleGetCourse(p) {
  var courseId = p.courseId;
  if (!courseId) return jsonResponse({ success: false, error: 'courseId is required' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cSheet = ss.getSheetByName(TABS.COURSES.name);
  var cData = cSheet.getDataRange().getValues();

  var foundCourse = null;
  for (var i = 1; i < cData.length; i++) {
    if (cData[i][0] == courseId) {
      foundCourse = {
        courseId: cData[i][0],
        title: cData[i][1],
        description: cData[i][2],
        category: cData[i][3],
        language: cData[i][4],
        thumbnailUrl: cData[i][5],
        published: cData[i][6] === true || cData[i][6] === 'true',
        createdAt: cData[i][7],
        updatedAt: cData[i][8],
        createdBy: cData[i][9]
      };
      break;
    }
  }

  if (!foundCourse) {
    return jsonResponse({ success: false, error: 'Course not found' });
  }

  // Fetch associated lessons
  var lSheet = ss.getSheetByName(TABS.LESSONS.name);
  var lData = lSheet.getDataRange().getValues();
  var lessons = [];

  for (var j = 1; j < lData.length; j++) {
    if (lData[j][1] == courseId) {
      lessons.push({
        lessonId: lData[j][0],
        courseId: lData[j][1],
        title: lData[j][2],
        description: lData[j][3],
        order: parseInt(lData[j][4], 10) || 1,
        driveFileId: lData[j][5],
        videoUrl: lData[j][6],
        duration: lData[j][7],
        published: lData[j][8] === true || lData[j][8] === 'true'
      });
    }
  }

  lessons.sort(function(a, b) { return a.order - b.order; });

  return jsonResponse({ success: true, course: foundCourse, lessons: lessons });
}

/**
 * Handle createCourse
 */
function handleCreateCourse(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.COURSES.name);

  var courseId = p.courseId || ('CRS-' + Date.now());
  var row = [
    courseId,
    p.title || 'नया कोर्स',
    p.description || '',
    p.category || 'pricing_profit',
    p.language || 'hi',
    p.thumbnailUrl || '',
    p.published !== undefined ? !!p.published : true,
    new Date().toISOString(),
    new Date().toISOString(),
    p.createdBy || 'Admin'
  ];

  sheet.appendRow(row);
  return jsonResponse({ success: true, courseId: courseId });
}

/**
 * Handle updateCourse
 */
function handleUpdateCourse(p) {
  var courseId = p.courseId;
  if (!courseId) return jsonResponse({ success: false, error: 'courseId required' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.COURSES.name);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == courseId) {
      var row = i + 1;
      if (p.title !== undefined) sheet.getRange(row, 2).setValue(p.title);
      if (p.description !== undefined) sheet.getRange(row, 3).setValue(p.description);
      if (p.category !== undefined) sheet.getRange(row, 4).setValue(p.category);
      if (p.language !== undefined) sheet.getRange(row, 5).setValue(p.language);
      if (p.thumbnailUrl !== undefined) sheet.getRange(row, 6).setValue(p.thumbnailUrl);
      if (p.published !== undefined) sheet.getRange(row, 7).setValue(!!p.published);
      sheet.getRange(row, 9).setValue(new Date().toISOString());
      return jsonResponse({ success: true, courseId: courseId });
    }
  }

  return jsonResponse({ success: false, error: 'Course not found' });
}

/**
 * Handle deleteCourse
 */
function handleDeleteCourse(p) {
  var courseId = p.courseId;
  if (!courseId) return jsonResponse({ success: false, error: 'courseId required' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.COURSES.name);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == courseId) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, courseId: courseId });
    }
  }

  return jsonResponse({ success: false, error: 'Course not found' });
}

/**
 * Handle createLesson
 */
function handleCreateLesson(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.LESSONS.name);

  var lessonId = p.lessonId || ('LSN-' + Date.now());
  var row = [
    lessonId,
    p.courseId || '',
    p.title || 'नया पाठ',
    p.description || '',
    parseInt(p.order, 10) || 1,
    p.driveFileId || '',
    p.videoUrl || '',
    p.duration || '15 min',
    p.published !== undefined ? !!p.published : true
  ];

  sheet.appendRow(row);
  return jsonResponse({ success: true, lessonId: lessonId });
}

/**
 * Handle updateLesson
 */
function handleUpdateLesson(p) {
  var lessonId = p.lessonId;
  if (!lessonId) return jsonResponse({ success: false, error: 'lessonId required' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.LESSONS.name);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == lessonId) {
      var row = i + 1;
      if (p.title !== undefined) sheet.getRange(row, 3).setValue(p.title);
      if (p.description !== undefined) sheet.getRange(row, 4).setValue(p.description);
      if (p.order !== undefined) sheet.getRange(row, 5).setValue(parseInt(p.order, 10));
      if (p.driveFileId !== undefined) sheet.getRange(row, 6).setValue(p.driveFileId);
      if (p.videoUrl !== undefined) sheet.getRange(row, 7).setValue(p.videoUrl);
      if (p.duration !== undefined) sheet.getRange(row, 8).setValue(p.duration);
      if (p.published !== undefined) sheet.getRange(row, 9).setValue(!!p.published);
      return jsonResponse({ success: true, lessonId: lessonId });
    }
  }

  return jsonResponse({ success: false, error: 'Lesson not found' });
}

/**
 * Handle deleteLesson
 */
function handleDeleteLesson(p) {
  var lessonId = p.lessonId;
  if (!lessonId) return jsonResponse({ success: false, error: 'lessonId required' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.LESSONS.name);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == lessonId) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, lessonId: lessonId });
    }
  }

  return jsonResponse({ success: false, error: 'Lesson not found' });
}

/**
 * Handle recordEnrollment
 */
function handleRecordEnrollment(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.ENROLLMENTS.name);

  var enrollmentId = 'ENR-' + Date.now();
  var row = [
    enrollmentId,
    p.userId || '',
    (p.normalizedEmail || '').toLowerCase().trim(),
    p.courseId || '',
    new Date().toISOString(),
    p.status || 'ENROLLED'
  ];

  sheet.appendRow(row);
  return jsonResponse({ success: true, enrollmentId: enrollmentId });
}

/**
 * Handle previewEmail (Get eligible recipient count)
 */
function handlePreviewEmail(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.USERS.name);
  var data = sheet.getDataRange().getValues();

  var recipientGroup = p.recipientGroup || 'all';
  var eligibleEmails = [];

  for (var i = 1; i < data.length; i++) {
    var email = data[i][1];
    var status = data[i][3];
    var verified = data[i][4];

    if (!email || !email.toString().includes('@')) continue;

    if (recipientGroup === 'verified_only' && !verified) continue;
    if (recipientGroup === 'active_only' && status !== 'ACTIVE') continue;

    eligibleEmails.push(email.toString().toLowerCase().trim());
  }

  // Deduplicate
  var uniqueList = [];
  var seen = {};
  for (var j = 0; j < eligibleEmails.length; j++) {
    if (!seen[eligibleEmails[j]]) {
      seen[eligibleEmails[j]] = true;
      uniqueList.push(eligibleEmails[j]);
    }
  }

  var dailyQuotaRemaining = MailApp.getRemainingDailyQuota();

  return jsonResponse({
    success: true,
    recipientCount: uniqueList.length,
    dailyQuotaRemaining: dailyQuotaRemaining,
    recipientGroup: recipientGroup
  });
}

/**
 * Handle sendEmailAnnouncement with quota safeguards and logging
 */
function handleSendEmail(p) {
  var subject = p.subject;
  var body = p.body;
  if (!subject || !body) {
    return jsonResponse({ success: false, error: 'Subject and body are required' });
  }

  var preview = handlePreviewEmail(p);
  var previewData = JSON.parse(preview.getContent());
  var remainingQuota = MailApp.getRemainingDailyQuota();

  if (remainingQuota <= 5) {
    return jsonResponse({
      success: false,
      error: 'Google MailApp daily sending quota exhausted or dangerously low (' + remainingQuota + ' remaining).'
    });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var uSheet = ss.getSheetByName(TABS.USERS.name);
  var uData = uSheet.getDataRange().getValues();
  var logSheet = ss.getSheetByName(TABS.EMAIL_LOGS.name);

  var campaignId = p.campaignId || ('CAMP-' + Date.now());
  var recipientGroup = p.recipientGroup || 'all';
  var sentCount = 0;
  var failedCount = 0;
  var sentEmails = {};

  for (var i = 1; i < uData.length; i++) {
    var email = uData[i][1];
    var status = uData[i][3];
    var verified = uData[i][4];

    if (!email || !email.toString().includes('@')) continue;
    var cleanEmail = email.toString().toLowerCase().trim();
    if (sentEmails[cleanEmail]) continue; // prevent duplicates

    if (recipientGroup === 'verified_only' && !verified) continue;
    if (recipientGroup === 'active_only' && status !== 'ACTIVE') continue;

    if (MailApp.getRemainingDailyQuota() <= 2) {
      break; // Abort gracefully before breaching quota limit
    }

    try {
      MailApp.sendEmail({
        to: cleanEmail,
        subject: subject,
        body: body + '\n\n---\nSakhiBiz Platform (सखीबिज)\nग्रामीण एवं लघु महिला उद्यमिता संवर्धन मंच'
      });

      sentEmails[cleanEmail] = true;
      sentCount++;

      logSheet.appendRow([
        'LOG-' + Date.now(),
        campaignId,
        cleanEmail,
        'SENT',
        new Date().toISOString(),
        ''
      ]);
    } catch (sendErr) {
      failedCount++;
      logSheet.appendRow([
        'LOG-' + Date.now(),
        campaignId,
        cleanEmail,
        'FAILED',
        new Date().toISOString(),
        sendErr.toString().substring(0, 200)
      ]);
    }
  }

  return jsonResponse({
    success: true,
    campaignId: campaignId,
    sentCount: sentCount,
    failedCount: failedCount,
    remainingDailyQuota: MailApp.getRemainingDailyQuota()
  });
}

/**
 * Handle getEmailLogs
 */
function handleGetEmailLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.EMAIL_LOGS.name);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ success: true, logs: [] });

  var logs = [];
  // Return latest 50 entries
  for (var i = data.length - 1; i >= 1 && logs.length < 50; i--) {
    logs.push({
      emailLogId: data[i][0],
      campaignId: data[i][1],
      recipientEmail: data[i][2],
      status: data[i][3],
      sentAt: data[i][4],
      errorMessage: data[i][5]
    });
  }

  return jsonResponse({ success: true, logs: logs });
}

/**
 * Handle logActivity
 */
function handleLogActivity(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.ACTIVITY_LOGS.name);

  var row = [
    p.eventId || ('EVT-' + Date.now()),
    p.actorUserId || '',
    p.actorRole || 'USER',
    p.action || '',
    p.targetId || '',
    p.timestamp || new Date().toISOString()
  ];

  sheet.appendRow(row);
  return jsonResponse({ success: true });
}

/**
 * Handle getActivityLogs
 */
function handleGetActivityLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TABS.ACTIVITY_LOGS.name);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ success: true, logs: [] });

  var logs = [];
  for (var i = data.length - 1; i >= 1 && logs.length < 50; i--) {
    logs.push({
      eventId: data[i][0],
      actorUserId: data[i][1],
      actorRole: data[i][2],
      action: data[i][3],
      targetId: data[i][4],
      timestamp: data[i][5]
    });
  }

  return jsonResponse({ success: true, logs: logs });
}

/**
 * Handle getStats
 */
function handleGetStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var uSheet = ss.getSheetByName(TABS.USERS.name);
  var cSheet = ss.getSheetByName(TABS.COURSES.name);
  var lSheet = ss.getSheetByName(TABS.LESSONS.name);
  var eSheet = ss.getSheetByName(TABS.ENROLLMENTS.name);

  var totalUsers = uSheet ? Math.max(0, uSheet.getLastRow() - 1) : 0;
  var totalCourses = cSheet ? Math.max(0, cSheet.getLastRow() - 1) : 0;
  var totalLessons = lSheet ? Math.max(0, lSheet.getLastRow() - 1) : 0;
  var totalEnrollments = eSheet ? Math.max(0, eSheet.getLastRow() - 1) : 0;

  return jsonResponse({
    success: true,
    totalUsers: totalUsers,
    totalCourses: totalCourses,
    totalLessons: totalLessons,
    totalEnrollments: totalEnrollments,
    dailyMailQuotaRemaining: MailApp.getRemainingDailyQuota()
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
