import pandas as pd
import numpy as np
from scipy.signal import butter, filtfilt, iirnotch

class FeatureExtractor:
    
    def __init__(self, fs=200, notch_freq=50, downsample_factor=1):
        """
        fs: Sampling frequency (Hz)
        notch_freq: Frequency for notch filter (Hz)
        downsample_factor: Integer factor to downsample signals (1 = no downsampling)
        """
        self.fs = fs
        self.notch_freq = notch_freq
        self.downsample_factor = downsample_factor

    # ---------------- CLEANING ----------------
    def _clean(self, df):
        df = df.dropna(how='all')
        df = df.interpolate(method="linear")
        df = df.drop_duplicates()

        # Drop EKG safely
        for ekg_col in ["EKG", "ekg"]:
            if ekg_col in df.columns:
                df = df.drop(columns=[ekg_col])

        # Remove extreme outliers (z-score > 5)
        z = np.abs((df - df.mean()) / df.std())
        df[z > 5] = np.nan
        df = df.interpolate(method="linear")

        # Remove DC offset
        df = df - df.mean()

        return df

    # ---------------- FILTERS ----------------
    def _bandpass_filter(self, data, low=0.5, high=40, order=4):
        nyq = 0.5 * self.fs
        b, a = butter(order, [low / nyq, high / nyq], btype='band')
        return filtfilt(b, a, data)

    def _notch_filter(self, data, Q=30):
        b, a = iirnotch(self.notch_freq, Q, self.fs)
        return filtfilt(b, a, data)

    def _apply_filters(self, df):
        for col in df.columns:
            signal = df[col].values
            signal = self._bandpass_filter(signal)
            signal = self._notch_filter(signal)
            df[col] = signal
        return df

    # ---------------- MAIN EXTRACTION ----------------
    def extract(self, df):
        # 1️⃣ Clean
        cleaned_df = self._clean(df)

        # 2️⃣ Filter
        filtered_df = self._apply_filters(cleaned_df)

        # 3️⃣ Extract information
        channels = filtered_df.columns.tolist()
        num_channels = len(channels)
        num_samples = len(filtered_df)
        duration = num_samples/ self.fs
        
        metadata = {
            "num_channels": num_channels,
            "channels": channels,
            "num_samples": num_samples,
            "duration" : duration,
        }

        # Apply optional downsampling
        if self.downsample_factor > 1:
            time = (np.arange(num_samples) / self.fs)[::self.downsample_factor].tolist()
            signals = {
                ch: filtered_df[ch].iloc[::self.downsample_factor].tolist()
                for ch in channels
            }
        else:
            time = (np.arange(num_samples) / self.fs).tolist()
            signals = {
                ch: filtered_df[ch].tolist()
                for ch in channels
            }

        # # Duration in seconds
        # duration = num_samples / self.fs

        # return {
        #     "num_channels": num_channels,
        #     "channels": channels,
        #     "num_samples": num_samples,
        #     "duration": duration,
        #     "time": time,
        #     "signals": signals
        # }
        return metadata, time, signals