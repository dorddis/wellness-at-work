# Meeting Detection Experiment
# Run this script while joining/leaving meetings to see what processes appear
# Usage: powershell -ExecutionPolicy Bypass -File meeting-detection-test.ps1

$meetingKeywords = @(
    'zoom', 'teams', 'meet', 'webex', 'slack', 'discord',
    'skype', 'hangout', 'bluejeans', 'gotomeeting', 'whereby',
    'jitsi', 'conference', 'call', 'video'
)

$browserProcesses = @('chrome', 'msedge', 'firefox', 'brave', 'opera')

function Get-MeetingProcesses {
    $processes = Get-Process | Where-Object { $_.MainWindowTitle -ne '' } |
        Select-Object ProcessName, Id, MainWindowTitle, @{
            Name='StartTime'
            Expression={ try { $_.StartTime } catch { 'N/A' } }
        }

    $results = @()

    foreach ($proc in $processes) {
        $isMeetingRelated = $false
        $matchedKeyword = ''
        $isBrowser = $browserProcesses -contains $proc.ProcessName.ToLower()

        # Check process name
        foreach ($keyword in $meetingKeywords) {
            if ($proc.ProcessName -match $keyword) {
                $isMeetingRelated = $true
                $matchedKeyword = "process:$keyword"
                break
            }
        }

        # Check window title
        if (-not $isMeetingRelated) {
            foreach ($keyword in $meetingKeywords) {
                if ($proc.MainWindowTitle -match $keyword) {
                    $isMeetingRelated = $true
                    $matchedKeyword = "title:$keyword"
                    break
                }
            }
        }

        # Include browsers regardless (might be in a meeting)
        if ($isBrowser -or $isMeetingRelated) {
            $results += [PSCustomObject]@{
                ProcessName = $proc.ProcessName
                PID = $proc.Id
                WindowTitle = $proc.MainWindowTitle
                IsBrowser = $isBrowser
                IsMeetingRelated = $isMeetingRelated
                MatchedKeyword = $matchedKeyword
            }
        }
    }

    return $results
}

function Show-Header {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  MEETING DETECTION EXPERIMENT" -ForegroundColor Cyan
    Write-Host "  Press Ctrl+C to stop" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Instructions:" -ForegroundColor Yellow
    Write-Host "1. Keep this window open"
    Write-Host "2. Join a meeting (Zoom, Google Meet, Teams, etc.)"
    Write-Host "3. Watch what processes/titles appear"
    Write-Host "4. Leave the meeting and see what disappears"
    Write-Host ""
    Write-Host "Monitoring every 2 seconds..." -ForegroundColor Green
    Write-Host ""
}

$previousProcesses = @{}
$iteration = 0

Show-Header

while ($true) {
    $iteration++
    $currentTime = Get-Date -Format "HH:mm:ss"
    $processes = Get-MeetingProcesses

    # Build current state
    $currentProcesses = @{}
    foreach ($proc in $processes) {
        $key = "$($proc.ProcessName)|$($proc.WindowTitle)"
        $currentProcesses[$key] = $proc
    }

    # Detect changes
    $newProcesses = @()
    $changedTitles = @()
    $removedProcesses = @()

    foreach ($key in $currentProcesses.Keys) {
        if (-not $previousProcesses.ContainsKey($key)) {
            # Check if it's a title change for existing process
            $proc = $currentProcesses[$key]
            $existingWithSameName = $previousProcesses.Keys | Where-Object { $_ -match "^$($proc.ProcessName)\|" }
            if ($existingWithSameName) {
                $changedTitles += $proc
            } else {
                $newProcesses += $proc
            }
        }
    }

    foreach ($key in $previousProcesses.Keys) {
        if (-not $currentProcesses.ContainsKey($key)) {
            $removedProcesses += $previousProcesses[$key]
        }
    }

    # Display changes
    if ($newProcesses.Count -gt 0 -or $changedTitles.Count -gt 0 -or $removedProcesses.Count -gt 0) {
        Write-Host "[$currentTime] === CHANGE DETECTED ===" -ForegroundColor Magenta

        foreach ($proc in $newProcesses) {
            $color = if ($proc.IsMeetingRelated) { "Green" } else { "White" }
            $marker = if ($proc.IsMeetingRelated) { "[MEETING!]" } else { "" }
            Write-Host "  + NEW: $($proc.ProcessName) $marker" -ForegroundColor $color
            Write-Host "    Title: $($proc.WindowTitle)" -ForegroundColor Gray
            if ($proc.MatchedKeyword) {
                Write-Host "    Matched: $($proc.MatchedKeyword)" -ForegroundColor Yellow
            }
        }

        foreach ($proc in $changedTitles) {
            $color = if ($proc.IsMeetingRelated) { "Yellow" } else { "White" }
            Write-Host "  ~ TITLE CHANGED: $($proc.ProcessName)" -ForegroundColor $color
            Write-Host "    New Title: $($proc.WindowTitle)" -ForegroundColor Gray
        }

        foreach ($proc in $removedProcesses) {
            Write-Host "  - REMOVED: $($proc.ProcessName)" -ForegroundColor Red
            Write-Host "    Was: $($proc.WindowTitle)" -ForegroundColor Gray
        }

        Write-Host ""
    }

    # Show current state every 10 iterations
    if ($iteration % 10 -eq 0) {
        Write-Host "[$currentTime] Current meeting-related processes:" -ForegroundColor Cyan
        $meetingProcs = $processes | Where-Object { $_.IsMeetingRelated }
        if ($meetingProcs.Count -eq 0) {
            Write-Host "  (none detected)" -ForegroundColor Gray
        } else {
            foreach ($proc in $meetingProcs) {
                Write-Host "  * $($proc.ProcessName): $($proc.WindowTitle)" -ForegroundColor Green
            }
        }
        Write-Host ""
    }

    $previousProcesses = $currentProcesses
    Start-Sleep -Seconds 2
}
