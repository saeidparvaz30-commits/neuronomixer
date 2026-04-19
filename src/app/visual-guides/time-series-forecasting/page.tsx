import type { Metadata } from "next";
import TimeSeriesForecastClient from "@/components/VisualGuides/TimeSeriesForecast/TimeSeriesForecastClient";

export const metadata: Metadata = {
  title: "Time Series Fundamentals & Forecasting | NeuroNomixer",
  description:
    "Master time series analysis: decomposition, trend, seasonality, smoothing, forecasting with prediction intervals, and temporal leakage awareness.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/time-series-forecasting",
  },
  openGraph: {
    title: "Time Series Fundamentals & Forecasting | NeuroNomixer",
    description:
      "Master time series analysis: decomposition, trend, seasonality, smoothing, forecasting with prediction intervals, and temporal leakage awareness.",
    url: "https://www.neuronomixer.com/visual-guides/time-series-forecasting",
    siteName: "NeuroNomixer",
    type: "website",
  },
};

export default function TimeSeriesForecastPage() {
  return <TimeSeriesForecastClient />;
}
