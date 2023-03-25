import { useCallback, useRef } from "react"

const useCoinbaseWebsocketApi = () => {
  const connectionRef = useRef<WebSocket>()

  const subscribe = useCallback(() => {
    connectionRef.current?.send(JSON.stringify({
      type: 'subscribe',
      product_ids: ['BTC-USD'],
      channels: ['level2'],
    }))
  }, [])

  const unSubscribe = useCallback(() => {
    connectionRef.current?.send(JSON.stringify({
      type: 'unsubscribe',
      product_ids: ['BTC-USD'],
      channels: ['level2'],
    }))
  }, [])

  const startListening = useCallback((onmessage: (e: MessageEvent<string>) => void) => {
    connectionRef.current = new WebSocket("wss://ws-feed.exchange.coinbase.com");
    connectionRef.current.onopen = subscribe
    connectionRef.current.onmessage = onmessage
  }, [])

  const stopListening = useCallback(() => {
    unSubscribe()
    connectionRef.current?.close()
    connectionRef.current = undefined
  }, [])

  return { startListening, stopListening }
}

export { useCoinbaseWebsocketApi }
