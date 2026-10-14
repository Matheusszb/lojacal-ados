$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8787'
$headers = @{ 'oai-authenticated-user-id' = 'local-owner'; 'oai-authenticated-user-email' = 'owner@example.test' }
function Admin($body) { Invoke-RestMethod -Uri "$base/api/admin" -Method Post -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ($body | ConvertTo-Json -Depth 12 -Compress) }
function State { Invoke-RestMethod -Uri "$base/api/admin" -Headers $headers }
function Assert($condition, $message) { if (-not $condition) { throw $message } }
$tag = [guid]::NewGuid().ToString('N').Substring(0, 8)
$category = Admin @{ action = 'saveCategory'; name = "Teste $tag"; active = $true; sort = 0 }
$product = Admin @{ action = 'saveProduct'; name = "Tênis Teste $tag"; brand = 'Teste'; categoryId = $category.id; description = 'Produto de teste local'; priceCents = 15000; active = $true; featured = $false; variants = @(@{ color = 'Preto'; size = '39'; sku = "TEST-$tag"; stock = 5; minStock = 1 }); images = @() }
$variant = (State).products | Where-Object { $_.id -eq $product.id } | Select-Object -ExpandProperty variants | Select-Object -First 1
Assert ($variant.stock -eq 5) 'Estoque inicial incorreto.'
$sale = Admin @{ action = 'recordSale'; customerName = 'Cliente teste'; phone = '47999999999'; paymentMethod = 'pix'; items = @(@{ variantId = $variant.id; quantity = 2; unitPriceCents = 12345 }) }
$state = State
$saleRow = $state.orders | Where-Object { $_.id -eq $sale.id }
Assert ($saleRow.total_cents -eq 24690 -and $saleRow.payment_method -eq 'pix' -and $saleRow.status -eq 'confirmed') 'Venda presencial incorreta.'
Assert ((($state.products | Where-Object { $_.id -eq $product.id }).variants | Select-Object -First 1).stock -eq 3) 'Venda presencial não reduziu o estoque.'
$checkout = Invoke-RestMethod -Uri "$base/api/store" -Method Post -ContentType 'application/json; charset=utf-8' -Body (@{ action = 'checkout'; name = 'Cliente online'; phone = '47999999999'; fulfillment = 'pickup'; notes = ''; items = @(@{ variantId = $variant.id; quantity = 1 }) } | ConvertTo-Json -Depth 8 -Compress)
Assert ($checkout.whatsappUrl -like 'https://wa.me/*') 'Checkout sem URL do WhatsApp.'
$null = Admin @{ action = 'confirmOrder'; orderId = $checkout.orderId }
$null = Admin @{ action = 'advanceOrder'; orderId = $checkout.orderId; status = 'separating' }
$null = Admin @{ action = 'advanceOrder'; orderId = $checkout.orderId; status = 'ready' }
$null = Admin @{ action = 'advanceOrder'; orderId = $checkout.orderId; status = 'completed' }
$state = State
Assert ((($state.products | Where-Object { $_.id -eq $product.id }).variants | Select-Object -First 1).stock -eq 2) 'Pedido online não reduziu o estoque.'
Assert (($state.orders | Where-Object { $_.id -eq $checkout.orderId }).status -eq 'completed') 'Pedido não avançou as etapas.'
$null = Admin @{ action = 'reverseSale'; orderId = $checkout.orderId }
$state = State
Assert ((($state.products | Where-Object { $_.id -eq $product.id }).variants | Select-Object -First 1).stock -eq 3) 'Estorno não devolveu o estoque.'
Assert ($state.metrics.sale_count -eq 1 -and $state.metrics.revenue_month -eq 24690) 'Indicadores incorretos após o estorno.'
Write-Output 'Smoke local passou: cadastro, venda presencial, checkout, etapas, estorno e indicadores.'
