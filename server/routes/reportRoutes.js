const express = require('express');
const router = express.Router();
const { getDashboardStats, getChartData, exportPDF, exportExcel } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/dashboard-stats', authenticate, getDashboardStats);
router.get('/charts', authenticate, getChartData);
router.get('/export/pdf', authenticate, authorize('manager', 'admin'), exportPDF);
router.get('/export/excel', authenticate, authorize('manager', 'admin'), exportExcel);

module.exports = router;
