$servers = @(
    ".",
    ".\SQLEXPRESS",
    "localhost",
    "localhost\SQLEXPRESS",
    "(local)",
    "127.0.0.1",
    "127.0.0.1\SQLEXPRESS",
    "localhost\SQL2019",
    "localhost\SQL2022"
)

$conn = $null
foreach ($server in $servers) {
    try {
        Write-Output "Trying connection to server: $server"
        $c = New-Object System.Data.SqlClient.SqlConnection("Server=$server;Database=UNIGIS_DataRepository_HESA;Integrated Security=True;TrustServerCertificate=True;Connection Timeout=2")
        $c.Open()
        $conn = $c
        Write-Output "Successfully connected to $server"
        break
    } catch {
        # Silent fail and try next
    }
}

if ($conn -eq $null) {
    Write-Output "ERROR: Could not connect to any SQL Server instance."
    exit 1
}

function Get-Columns($tableName) {
    Write-Output "--- Columns of $tableName ---"
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '$tableName' ORDER BY COLUMN_NAME"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Output "$($reader.GetValue(0)) ($($reader.GetValue(1)))"
    }
    $reader.Close()
}

Get-Columns "OrdenParada"
Get-Columns "PedidoItem"
Get-Columns "Parada"

$conn.Close()
