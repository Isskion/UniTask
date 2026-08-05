$servers = @(
    ".",
    ".\SQLEXPRESS",
    "localhost",
    "localhost\SQLEXPRESS",
    "(local)",
    "127.0.0.1",
    "127.0.0.1\SQLEXPRESS",
    "localhost\SQL2019",
    "localhost\SQL2022",
    "(localdb)\MSSQLLocalDB"
)

$conn = $null
$activeServer = $null
$activeDb = $null

# First, find a server that responds and find UNIGIS databases
foreach ($server in $servers) {
    try {
        $c = New-Object System.Data.SqlClient.SqlConnection("Server=$server;Database=master;Integrated Security=True;TrustServerCertificate=True;Connection Timeout=1")
        $c.Open()
        
        # Query database names
        $cmd = $c.CreateCommand()
        $cmd.CommandText = "SELECT name FROM sys.databases WHERE name LIKE '%UNIGIS%'"
        $reader = $cmd.ExecuteReader()
        $dbs = @()
        while ($reader.Read()) {
            $dbs += $reader.GetValue(0)
        }
        $reader.Close()
        
        if ($dbs.Count -gt 0) {
            $conn = $c
            $activeServer = $server
            # Choose the most relevant database
            # Prioritize Transpais/TSP if it exists, otherwise choose HESA or the first one
            $tspDb = $dbs | Where-Object { $_ -like "*TRANSPAIS*" -or $_ -like "*TSP*" }
            if ($tspDb) {
                $activeDb = $tspDb[0]
            } else {
                $activeDb = $dbs[0]
            }
            Write-Output "Connected to Server: $activeServer"
            Write-Output "Found databases: $($dbs -join ', ')"
            Write-Output "Using Database: $activeDb"
            break
        } else {
            $c.Close()
        }
    } catch {
        # Try next server
    }
}

if ($conn -eq $null) {
    Write-Output "ERROR: Could not find any SQL Server containing a UNIGIS database."
    exit 1
}

# Reconnect to the active database
$conn.Close()
$conn = New-Object System.Data.SqlClient.SqlConnection("Server=$activeServer;Database=$activeDb;Integrated Security=True;TrustServerCertificate=True")
$conn.Open()

# Helper function to print columns of a table
function Get-TableSchema($tableName) {
    Write-Output "`n========================================"
    Write-Output "TABLA: $tableName"
    Write-Output "========================================"
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = '$tableName' 
                        ORDER BY COLUMN_NAME"
    try {
        $reader = $cmd.ExecuteReader()
        while ($reader.Read()) {
            $colName = $reader.GetValue(0)
            $colType = $reader.GetValue(1)
            $colLen = if ($reader.IsDBNull(2)) { "" } else { "($($reader.GetValue(2)))" }
            $colNull = if ($reader.GetValue(3) -eq "YES") { "NULL" } else { "NOT NULL" }
            Write-Output "  - $colName $colType$colLen $colNull"
        }
        $reader.Close()
    } catch {
        Write-Output "  Error o tabla inexistente: $_"
    }
}

# List all tables containing "Domicilio" or "Cliente" or "Pedido"
Write-Output "`n--- Buscando tablas relacionales ---"
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND (TABLE_NAME LIKE '%Pedido%' OR TABLE_NAME LIKE '%Domicilio%' OR TABLE_NAME LIKE '%Cliente%' OR TABLE_NAME LIKE '%Orden%') ORDER BY TABLE_NAME"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Output "  Encontrada tabla: $($reader.GetValue(0))"
}
$reader.Close()

# Print detailed schemas of dominant tables
Get-TableSchema "Pedido"
Get-TableSchema "PedidoItem"
Get-TableSchema "DomicilioOrden"
Get-TableSchema "ClienteOrden"

$conn.Close()
