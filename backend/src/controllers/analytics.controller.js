import {
  getMonthlySummaryService,
  getCategoryBreakdownService,
  getOverviewService,
  getMonthlyTrendService,
} from "../services/analytics.service.js";

// @route   GET /api/analytics/monthly
// @access  Private
export const getMonthlySummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const data = await getMonthlySummaryService(
      req.user._id,
      Number(month),
      Number(year),
    );

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/categories
// @access  Private
export const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { type, month, year } = req.query;

    if (!type) {
      return res.status(400).json({ message: "Transaction type required" });
    }

    const data = await getCategoryBreakdownService(
      req.user._id,
      type,
      month ? Number(month) : null,
      year ? Number(year) : null,
    );

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/overview
// @access  Private
export const getOverview = async (req, res, next) => {
  try {
    const data = await getOverviewService(req.user._id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/trend
// @access  Private
export const getMonthlyTrend = async (req, res, next) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ message: "Year required" });
    }

    const data = await getMonthlyTrendService(req.user._id, Number(year));

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
