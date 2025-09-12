use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tokio::fs as tokio_fs;

/**
 * 奖品颜色枚举 - 与前端保持一致
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PrizeColor {
    Red,
    Yellow,
    Blue,
}

/**
 * 奖品基础信息
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prize {
    pub id: String,
    pub color: PrizeColor,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
}

/**
 * 抽奖结果
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LotteryResult {
    #[serde(rename = "prizeId")]
    pub prize_id: String,
    pub timestamp: i64,
    #[serde(rename = "cycleId")]
    pub cycle_id: String,
    #[serde(rename = "drawNumber")]
    pub draw_number: u32,
}

/**
 * 剩余抽奖次数
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemainingDraws {
    pub red: u32,
    pub yellow: u32,
    pub blue: u32,
}

/**
 * 抽奖周期
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LotteryCycle {
    pub id: String,
    #[serde(rename = "startTime")]
    pub start_time: i64,
    #[serde(rename = "endTime")]
    pub end_time: Option<i64>,
    pub results: Vec<LotteryResult>,
    pub completed: bool,
    #[serde(rename = "remainingDraws")]
    pub remaining_draws: RemainingDraws,
}

/**
 * 抽奖系统配置
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LotteryConfig {
    #[serde(rename = "drawsPerCycle")]
    pub draws_per_cycle: u32,
    #[serde(rename = "drawsPerColor")]
    pub draws_per_color: u32,
    #[serde(rename = "enableAnimations")]
    pub enable_animations: bool,
    #[serde(rename = "animationDuration")]
    pub animation_duration: u32,
}

/**
 * 抽奖系统整体状态
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LotteryState {
    #[serde(rename = "currentCycle")]
    pub current_cycle: LotteryCycle,
    pub history: Vec<LotteryCycle>,
    #[serde(rename = "availablePrizes")]
    pub available_prizes: Vec<Prize>,
    pub config: LotteryConfig,
}

/**
 * 获取数据存储路径
 */
fn get_data_path() -> Result<PathBuf, String> {
    let documents_dir = dirs::document_dir()
        .ok_or("无法获取用户文档目录")?;
    
    let lottery_dir = documents_dir.join("lottery-game");
    
    // 确保目录存在
    if !lottery_dir.exists() {
        fs::create_dir_all(&lottery_dir)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }
    
    Ok(lottery_dir.join("data.json"))
}

/**
 * 获取备份路径
 */
fn get_backup_path() -> Result<PathBuf, String> {
    let documents_dir = dirs::document_dir()
        .ok_or("无法获取用户文档目录")?;
    
    let lottery_dir = documents_dir.join("lottery-game");
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    
    Ok(lottery_dir.join(format!("data_backup_{}.json", timestamp)))
}

/**
 * 保存抽奖数据
 */
#[tauri::command]
pub async fn save_lottery_data(data: LotteryState) -> Result<(), String> {
    let data_path = get_data_path()?;
    
    // 序列化数据
    let json_data = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("数据序列化失败: {}", e))?;
    
    // 异步写入文件
    tokio_fs::write(&data_path, json_data)
        .await
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    log::info!("抽奖数据已保存到: {:?}", data_path);
    Ok(())
}

/**
 * 加载抽奖数据
 */
#[tauri::command]
pub async fn load_lottery_data() -> Result<LotteryState, String> {
    let data_path = get_data_path()?;
    
    // 检查文件是否存在
    if !data_path.exists() {
        log::info!("数据文件不存在，返回默认状态");
        return Ok(create_default_state());
    }
    
    // 异步读取文件
    let json_data = tokio_fs::read_to_string(&data_path)
        .await
        .map_err(|e| format!("读取文件失败: {}", e))?;
    
    // 反序列化数据
    let lottery_state: LotteryState = serde_json::from_str(&json_data)
        .map_err(|e| {
            log::error!("数据反序列化失败: {}", e);
            format!("数据格式错误，可能已损坏: {}", e)
        })?;
    
    log::info!("抽奖数据已加载从: {:?}", data_path);
    Ok(lottery_state)
}

/**
 * 备份数据
 */
#[tauri::command]
pub async fn backup_data() -> Result<String, String> {
    let data_path = get_data_path()?;
    let backup_path = get_backup_path()?;
    
    // 检查原始数据文件是否存在
    if !data_path.exists() {
        return Err("没有找到数据文件，无法备份".to_string());
    }
    
    // 复制文件到备份位置
    tokio_fs::copy(&data_path, &backup_path)
        .await
        .map_err(|e| format!("备份失败: {}", e))?;
    
    let backup_path_str = backup_path.to_string_lossy().to_string();
    log::info!("数据已备份到: {}", backup_path_str);
    
    Ok(backup_path_str)
}

/**
 * 从备份恢复数据
 */
#[tauri::command]
pub async fn restore_from_backup(backup_path: String) -> Result<(), String> {
    let backup_path = PathBuf::from(backup_path);
    let data_path = get_data_path()?;
    
    // 检查备份文件是否存在
    if !backup_path.exists() {
        return Err("备份文件不存在".to_string());
    }
    
    // 验证备份文件格式
    let backup_data = tokio_fs::read_to_string(&backup_path)
        .await
        .map_err(|e| format!("读取备份文件失败: {}", e))?;
    
    let _: LotteryState = serde_json::from_str(&backup_data)
        .map_err(|e| format!("备份文件格式错误: {}", e))?;
    
    // 复制备份文件到数据位置
    tokio_fs::copy(&backup_path, &data_path)
        .await
        .map_err(|e| format!("恢复失败: {}", e))?;
    
    log::info!("数据已从备份恢复: {:?}", backup_path);
    Ok(())
}

/**
 * 验证数据完整性
 */
#[tauri::command]
pub async fn validate_data() -> Result<bool, String> {
    let data_path = get_data_path()?;
    
    // 如果文件不存在，认为是有效的（将创建默认状态）
    if !data_path.exists() {
        return Ok(true);
    }
    
    // 尝试读取和解析数据
    match tokio_fs::read_to_string(&data_path).await {
        Ok(json_data) => {
            match serde_json::from_str::<LotteryState>(&json_data) {
                Ok(state) => {
                    // 进一步验证数据逻辑
                    validate_lottery_state(&state)
                }
                Err(_) => Ok(false)
            }
        }
        Err(_) => Ok(false)
    }
}

/**
 * 创建默认抽奖状态
 */
fn create_default_state() -> LotteryState {
    let now = chrono::Utc::now().timestamp_millis();
    
    LotteryState {
        current_cycle: LotteryCycle {
            id: format!("cycle_{}_{}", now, uuid::Uuid::new_v4().simple()),
            start_time: now,
            end_time: None,
            results: Vec::new(),
            completed: false,
            remaining_draws: RemainingDraws {
                red: 2,
                yellow: 2,
                blue: 2,
            },
        },
        history: Vec::new(),
        available_prizes: create_default_prizes(),
        config: LotteryConfig {
            draws_per_cycle: 6,
            draws_per_color: 2,
            enable_animations: true,
            animation_duration: 2000,
        },
    }
}

/**
 * 创建默认奖品列表
 */
fn create_default_prizes() -> Vec<Prize> {
    vec![
        Prize {
            id: "prize_red_1".to_string(),
            color: PrizeColor::Red,
            name: "红色大奖".to_string(),
            description: Some("价值丰厚的红色奖品".to_string()),
            icon: None,
        },
        Prize {
            id: "prize_red_2".to_string(),
            color: PrizeColor::Red,
            name: "红色好礼".to_string(),
            description: Some("精美的红色礼品".to_string()),
            icon: None,
        },
        Prize {
            id: "prize_yellow_1".to_string(),
            color: PrizeColor::Yellow,
            name: "黄色大奖".to_string(),
            description: Some("价值丰厚的黄色奖品".to_string()),
            icon: None,
        },
        Prize {
            id: "prize_yellow_2".to_string(),
            color: PrizeColor::Yellow,
            name: "黄色好礼".to_string(),
            description: Some("精美的黄色礼品".to_string()),
            icon: None,
        },
        Prize {
            id: "prize_blue_1".to_string(),
            color: PrizeColor::Blue,
            name: "蓝色大奖".to_string(),
            description: Some("价值丰厚的蓝色奖品".to_string()),
            icon: None,
        },
        Prize {
            id: "prize_blue_2".to_string(),
            color: PrizeColor::Blue,
            name: "蓝色好礼".to_string(),
            description: Some("精美的蓝色礼品".to_string()),
            icon: None,
        },
    ]
}

/**
 * 验证抽奖状态的逻辑完整性
 */
fn validate_lottery_state(state: &LotteryState) -> Result<bool, String> {
    // 验证配置
    if state.config.draws_per_cycle == 0 
        || state.config.draws_per_color == 0
        || state.config.draws_per_cycle != state.config.draws_per_color * 3 {
        return Ok(false);
    }
    
    // 验证当前周期
    let cycle = &state.current_cycle;
    let total_remaining = cycle.remaining_draws.red 
        + cycle.remaining_draws.yellow 
        + cycle.remaining_draws.blue;
    let completed_draws = cycle.results.len() as u32;
    
    if total_remaining + completed_draws != state.config.draws_per_cycle {
        return Ok(false);
    }
    
    // 验证奖品列表
    if state.available_prizes.is_empty() {
        return Ok(false);
    }
    
    Ok(true)
}