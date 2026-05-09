$uri = "http://127.0.0.1:40000/api/launch-routine"
$body = '{"routineName": "ModGen Course Activation", "courseId": "eval-benchmark"}'

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $body -TimeoutSec 30
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response:"
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.InnerException) {
        Write-Host "Inner: $($_.Exception.InnerException.Message)"
    }
}
