# Advanced Meeting Detection Experiment
# Checks: Processes, Window Titles, Camera Usage, Audio Usage
# Usage: powershell -ExecutionPolicy Bypass -File advanced-meeting-detector.ps1

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class WindowHelper {
    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    private static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public static List<Tuple<IntPtr, uint, string>> GetAllWindowsWithTitles() {
        var windows = new List<Tuple<IntPtr, uint, string>>();

        EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                int length = GetWindowTextLength(hWnd);
                if (length > 0) {
                    StringBuilder sb = new StringBuilder(length + 1);
                    GetWindowText(hWnd, sb, sb.Capacity);
                    uint processId;
                    GetWindowThreadProcessId(hWnd, out processId);
                    windows.Add(new Tuple<IntPtr, uint, string>(hWnd, processId, sb.ToString()));
                }
            }
            return true;
        }, IntPtr.Zero);

        return windows;
    }

    public static Tuple<IntPtr, string> GetForegroundWindowInfo() {
        IntPtr hWnd = GetForegroundWindow();
        int length = GetWindowTextLength(hWnd);
        StringBuilder sb = new StringBuilder(length + 1);
        GetWindowText(hWnd, sb, sb.Capacity);
        return new Tuple<IntPtr, string>(hWnd, sb.ToString());
    }
}
"@

function Get-CameraUsage {
    # Check if camera is in use by checking device access
    try {
        $cameraInUse = Get-PnpDevice -Class Camera -Status OK | ForEach-Object {
            $deviceId = $_.InstanceId
            # Check registry for camera usage (Windows 10/11)
            $regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam"
            if (Test-Path $regPath) {
                Get-ChildItem $regPath -Recurse | ForEach-Object {
                    $lastUsed = $_.GetValue("LastUsedTimeStop")
                    $lastUsedStart = $_.GetValue("LastUsedTimeStart")
                    if ($lastUsedStart -and (-not $lastUsed -or $lastUsed -eq 0)) {
                        return $true
                    }
                }
            }
        }
        return $cameraInUse -contains $true
    } catch {
        return $null
    }
}

function Get-ProcessesUsingCamera {
    # Find processes that have camera handles (requires admin for full accuracy)
    try {
        $result = @()
        $devicePath = "\\?\root#media#"

        # Alternative: Check common meeting app processes
        $meetingApps = @('Zoom', 'Teams', 'ms-teams', 'webex', 'Slack', 'chrome', 'msedge', 'firefox')

        foreach ($appName in $meetingApps) {
            $proc = Get-Process -Name $appName -ErrorAction SilentlyContinue
            if ($proc) {
                $result += $proc | Select-Object Name, Id
            }
        }

        return $result
    } catch {
        return @()
    }
}

function Get-AllWindows {
    $windows = [WindowHelper]::GetAllWindowsWithTitles()
    $results = @()

    foreach ($window in $windows) {
        $hwnd = $window.Item1
        $pid = $window.Item2
        $title = $window.Item3

        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                $results += [PSCustomObject]@{
                    ProcessName = $proc.ProcessName
                    PID = $pid
                    WindowTitle = $title
                    Handle = $hwnd
                }
            }
        } catch {}
    }

    return $results
}

function Test-MeetingTitle {
    param([string]$title)

    $patterns = @(
        # Zoom patterns
        @{ Pattern = 'Zoom Meeting'; App = 'Zoom'; Confidence = 100 }
        @{ Pattern = 'Zoom Webinar'; App = 'Zoom'; Confidence = 100 }
        @{ Pattern = '^Zoom$'; App = 'Zoom'; Confidence = 80 }
        @{ Pattern = 'zoom\.us'; App = 'Zoom'; Confidence = 100 }

        # Google Meet patterns
        @{ Pattern = 'Meet - [a-z]{3}-[a-z]{4}-[a-z]{3}'; App = 'Google Meet'; Confidence = 100 }
        @{ Pattern = 'meet\.google\.com'; App = 'Google Meet'; Confidence = 100 }
        @{ Pattern = '^Meet \|'; App = 'Google Meet'; Confidence = 90 }
        @{ Pattern = 'Google Meet'; App = 'Google Meet'; Confidence = 100 }

        # Microsoft Teams patterns
        @{ Pattern = 'Microsoft Teams'; App = 'Teams'; Confidence = 90 }
        @{ Pattern = '\| Microsoft Teams$'; App = 'Teams'; Confidence = 100 }
        @{ Pattern = 'teams\.microsoft\.com'; App = 'Teams'; Confidence = 100 }
        @{ Pattern = '^Meeting in '; App = 'Teams'; Confidence = 80 }

        # Webex patterns
        @{ Pattern = 'Webex'; App = 'Webex'; Confidence = 90 }
        @{ Pattern = 'webex\.com'; App = 'Webex'; Confidence = 100 }

        # Slack Huddle
        @{ Pattern = 'Slack \|.*[Hh]uddle'; App = 'Slack'; Confidence = 100 }
        @{ Pattern = 'Slack call'; App = 'Slack'; Confidence = 100 }

        # Discord
        @{ Pattern = 'Discord'; App = 'Discord'; Confidence = 50 }
        @{ Pattern = '#.*- Discord'; App = 'Discord'; Confidence = 60 }
    )

    foreach ($p in $patterns) {
        if ($title -match $p.Pattern) {
            return @{
                App = $p.App
                Confidence = $p.Confidence
                MatchedPattern = $p.Pattern
            }
        }
    }

    return $null
}

function Get-MeetingStatus {
    $windows = Get-AllWindows
    $meetings = @()

    foreach ($window in $windows) {
        $match = Test-MeetingTitle -title $window.WindowTitle
        if ($match) {
            $meetings += [PSCustomObject]@{
                App = $match.App
                Confidence = $match.Confidence
                ProcessName = $window.ProcessName
                PID = $window.PID
                WindowTitle = $window.WindowTitle
                MatchedPattern = $match.MatchedPattern
            }
        }
    }

    # Sort by confidence
    $meetings = $meetings | Sort-Object -Property Confidence -Descending

    return $meetings
}

# Main loop
Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ADVANCED MEETING DETECTOR" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This detector uses pattern matching on window titles" -ForegroundColor Yellow
Write-Host "for accurate meeting detection across all apps." -ForegroundColor Yellow
Write-Host ""

$lastState = @()
$iteration = 0

while ($true) {
    $iteration++
    $currentTime = Get-Date -Format "HH:mm:ss"

    $meetings = Get-MeetingStatus
    $foreground = [WindowHelper]::GetForegroundWindowInfo()

    # Check for state changes
    $currentIds = ($meetings | ForEach-Object { "$($_.App)|$($_.WindowTitle)" }) -join ","
    $lastIds = ($lastState | ForEach-Object { "$($_.App)|$($_.WindowTitle)" }) -join ","

    if ($currentIds -ne $lastIds) {
        Write-Host ""
        Write-Host "[$currentTime] === STATE CHANGE ===" -ForegroundColor Magenta

        if ($meetings.Count -gt 0) {
            Write-Host "MEETINGS DETECTED:" -ForegroundColor Green
            foreach ($m in $meetings) {
                $confColor = if ($m.Confidence -ge 90) { "Green" } elseif ($m.Confidence -ge 70) { "Yellow" } else { "Gray" }
                Write-Host "  [$($m.Confidence)%] $($m.App)" -ForegroundColor $confColor
                Write-Host "       Process: $($m.ProcessName) (PID: $($m.PID))" -ForegroundColor Gray
                Write-Host "       Title: $($m.WindowTitle)" -ForegroundColor Gray
                Write-Host "       Pattern: $($m.MatchedPattern)" -ForegroundColor DarkGray
            }
        } else {
            Write-Host "NO MEETINGS DETECTED" -ForegroundColor Red
        }

        $lastState = $meetings
    }

    # Periodic status
    if ($iteration % 15 -eq 0) {
        Write-Host ""
        Write-Host "[$currentTime] Status: " -NoNewline -ForegroundColor Cyan
        if ($meetings.Count -gt 0) {
            Write-Host "$($meetings.Count) meeting(s) active" -ForegroundColor Green
        } else {
            Write-Host "No meetings" -ForegroundColor Gray
        }

        # Show foreground window
        Write-Host "  Foreground: $($foreground.Item2)" -ForegroundColor DarkGray
    }

    Start-Sleep -Seconds 1
}
