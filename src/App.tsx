import { LotteryProvider, LotteryErrorBoundary } from './context/LotteryContext'
import { LotteryGameWithContext } from './pages/LotteryGameWithContext'
import './App.css'

function App() {
  return (
    <LotteryErrorBoundary>
      <LotteryProvider>
        <LotteryGameWithContext />
      </LotteryProvider>
    </LotteryErrorBoundary>
  )
}

export default App
