import { useState, useEffect, useRef, useCallback } from 'react';
import throttle from 'lodash.throttle'
import { useCoinbaseWebsocketApi } from './hooks/use-coinbase-websocket-api';

type SnapshotData = {
  type: 'snapshot';
  product_id: string;
  bids: [string, string][];
  asks: [string, string][];
}

type UpdateData = {
  type: 'l2update';
  product_id: string;
  changes: ['buy' | 'sell', string, string][];
}

const MAX_CNT = 8

const RERENDER_PR_MS = 100

const App = () => {
  const [_, set] = useState<number>(0);
  const bidsMap = useRef<Map<string, string>>(new Map())
  const asksMap = useRef<Map<string, string>>(new Map())
  const { startListening, stopListening } = useCoinbaseWebsocketApi()

  const now = new Date()

  const initTime = useRef<number>(now.valueOf())
  const reRenderCnt = useRef<number>(0)

  reRenderCnt.current += 1

  const secsElapsed = (now.valueOf() - initTime.current) / 1000

  const numOfRendersPerSec = reRenderCnt.current / secsElapsed

  const forceRerender = useCallback(() => set(x => x + 1), [])

  const forceRerenderThrottled = throttle(forceRerender, RERENDER_PR_MS)

  const handleMessage = useCallback((e: MessageEvent<string>) => {
    const data = JSON.parse(e.data) as SnapshotData | UpdateData
    if (data.type === 'l2update') {
      // Updates only contain changes to the order book
      const [side, price, size] = data.changes[0];
      if (side === 'buy') {
        if (parseFloat(size) === 0) {
          bidsMap.current.delete(price)
        } else {
          bidsMap.current.set(price, size)
        }
        forceRerenderThrottled()
      } else if (side === 'sell') {
        if (parseFloat(size) === 0) {
          asksMap.current.delete(price)
        } else {
          asksMap.current.set(price, size)
        }
        forceRerenderThrottled()
      }
    } else if (data.type === 'snapshot') {
      // The initial snapshot contains the entire order book
      // data.bids.forEach(([price, size]) => bidsMap.current.set(price, size));
      // data.asks.forEach(([price, size]) => asksMap.current.set(price, size));
      // forceRerenderThrottled()
    }
  }, [])

  useEffect(() => {
    startListening(handleMessage)
    return stopListening
  }, [])

  return (
    <div>
      <h1>BTC-USD Order Book:</h1>
      <div>Total rerenders: {reRenderCnt.current}</div>
      <div>Secs elapsed: {secsElapsed}</div>
      <div>Rerender/sec rate: {numOfRendersPerSec}</div>
      <div>Bids Map size: {asksMap.current.size}</div>
      <div>Asks Map size: {asksMap.current.size}</div>
      <button onClick={stopListening}>Stop</button>
      <table>
        <thead>
          <tr>
            <th>Ask price</th>
            <th>Ask size</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(asksMap.current)
            .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])) // Lowest asks first
            .slice(0, MAX_CNT)
            .reverse() // bcz we want to display in reverse order
            .map(([price, size]) => (
              <tr key={price}>
                <td style={{ color: 'red' }}>{price}</td>
                <td>{size}</td>
              </tr>
            ))}
          <tr>
            <td colSpan={2}></td>
          </tr>
          <tr>
            <td colSpan={2}></td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Bid price</th>
            <th>Bid size</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(bidsMap.current)
            .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])) // Top bids first
            .slice(0, MAX_CNT)
            .map(([price, size]) => (
              <tr key={price}>
                <td style={{ color: 'green' }}>{price}</td>
                <td>{size}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export { App };
