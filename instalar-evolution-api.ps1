# Instalar Evolution API no Windows sem Docker
# Execute este script no PowerShell como Administrador

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Instalador Evolution API - DOMUS BARBER" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "[ERRO] Node.js nao encontrado!" -ForegroundColor Red
    Write-Host "Instale em: https://nodejs.org" -ForegroundColor Yellow
    Start-Process "https://nodejs.org/en/download"
    exit 1
}
Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green

# 2. Verificar Git
$gitVersion = git --version 2>$null
if (-not $gitVersion) {
    Write-Host "[AVISO] Git nao encontrado. Baixando ZIP direto..." -ForegroundColor Yellow
    $zipUrl = "https://github.com/EvolutionAPI/evolution-api/archive/refs/heads/main.zip"
    $zipPath = "$env:TEMP\evolution-api.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath "C:\" -Force
    Rename-Item "C:\evolution-api-main" "C:\evolution-api" -ErrorAction SilentlyContinue
} else {
    Write-Host "[OK] Git encontrado" -ForegroundColor Green
    $installDir = "C:\evolution-api"
    if (-not (Test-Path $installDir)) {
        Write-Host "Clonando Evolution API..." -ForegroundColor Yellow
        git clone https://github.com/EvolutionAPI/evolution-api.git $installDir
    } else {
        Write-Host "[OK] Evolution API ja existe em $installDir" -ForegroundColor Green
    }
}

$installDir = "C:\evolution-api"
Set-Location $installDir

# 3. Instalar dependencias
Write-Host "Instalando dependencias npm..." -ForegroundColor Yellow
npm install --legacy-peer-deps 2>&1 | Tail -5

# 4. Criar .env com chave aleatoria
$apiKey = "domus-$(Get-Random -Minimum 100000 -Maximum 999999)"
$envContent = @"
SERVER_URL=http://localhost:8080
DEL_INSTANCE=false
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=$apiKey
DATABASE_ENABLED=false
LOG_LEVEL=ERROR
WEBHOOK_GLOBAL_ENABLED=false
"@
$envContent | Out-File -FilePath "$installDir\.env" -Encoding UTF8

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  INSTALACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "URL da API:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "API Key:     $apiKey" -ForegroundColor Cyan
Write-Host ""
Write-Host "ADICIONE AO ARQUIVO .env.local DO DOMUS BARBER:" -ForegroundColor Yellow
Write-Host "EVOLUTION_API_URL=http://localhost:8080" -ForegroundColor White
Write-Host "EVOLUTION_API_KEY=$apiKey" -ForegroundColor White
Write-Host ""

# Salvar config no domus-barber
$domusEnv = "C:\Users\Windows\.gemini\antigravity\scratch\domus-barber\.env.local"
$domusEnvContent = @"
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=$apiKey
NEXT_PUBLIC_APP_URL=http://localhost:3001
"@
$domusEnvContent | Out-File -FilePath $domusEnv -Encoding UTF8
Write-Host "[AUTOMATICO] .env.local do DOMUS BARBER atualizado!" -ForegroundColor Green
Write-Host ""

# 5. Iniciar servidor
Write-Host "Iniciando Evolution API na porta 8080..." -ForegroundColor Yellow
npm run start:prod
