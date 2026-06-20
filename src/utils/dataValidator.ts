import type { Waybill, ValidationIssue, ValidationSeverity } from '@/types';
import dayjs from 'dayjs';

export function validateWaybill(waybill: Waybill): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let issueCounter = 0;

  const makeId = () => `val_${waybill.id}_${++issueCounter}`;

  const tempRecords = waybill.temperatureRecords;
  const gpsPoints = waybill.gpsPoints;
  const loadingEvents = waybill.loadingEvents;
  const departureTime = dayjs(waybill.departureTime);
  const arrivalTime = dayjs(waybill.arrivalTime);

  if (tempRecords.length > 1) {
    let maxGap = 0;
    let gapStart = '';
    let gapEnd = '';
    for (let i = 1; i < tempRecords.length; i++) {
      const prev = dayjs(tempRecords[i - 1].timestamp);
      const curr = dayjs(tempRecords[i].timestamp);
      const gap = curr.diff(prev, 'minute');
      if (gap > maxGap) {
        maxGap = gap;
        gapStart = tempRecords[i - 1].timestamp;
        gapEnd = tempRecords[i].timestamp;
      }
    }
    if (maxGap > 10) {
      issues.push({
        id: makeId(),
        waybillId: waybill.id,
        severity: maxGap > 30 ? 'error' : 'warning',
        category: 'time_gap',
        message: `温度记录存在 ${maxGap} 分钟时间缺口`,
        detail: `${dayjs(gapStart).format('HH:mm')} → ${dayjs(gapEnd).format('HH:mm')}，间隔 ${maxGap} 分钟，可能存在数据丢失`,
      });
    }
  }

  if (gpsPoints.length > 1) {
    let maxGap = 0;
    let gapStart = '';
    let gapEnd = '';
    for (let i = 1; i < gpsPoints.length; i++) {
      const prev = dayjs(gpsPoints[i - 1].timestamp);
      const curr = dayjs(gpsPoints[i].timestamp);
      const gap = curr.diff(prev, 'minute');
      if (gap > maxGap) {
        maxGap = gap;
        gapStart = gpsPoints[i - 1].timestamp;
        gapEnd = gpsPoints[i].timestamp;
      }
    }
    if (maxGap > 10) {
      issues.push({
        id: makeId(),
        waybillId: waybill.id,
        severity: maxGap > 30 ? 'error' : 'warning',
        category: 'time_gap',
        message: `GPS轨迹存在 ${maxGap} 分钟时间缺口`,
        detail: `${dayjs(gapStart).format('HH:mm')} → ${dayjs(gapEnd).format('HH:mm')}，间隔 ${maxGap} 分钟，可能存在信号丢失`,
      });
    }
  }

  if (tempRecords.length > 0 && gpsPoints.length > 0) {
    const tempStart = dayjs(tempRecords[0].timestamp);
    const tempEnd = dayjs(tempRecords[tempRecords.length - 1].timestamp);
    const gpsStart = dayjs(gpsPoints[0].timestamp);
    const gpsEnd = dayjs(gpsPoints[gpsPoints.length - 1].timestamp);

    const startDiff = Math.abs(tempStart.diff(gpsStart, 'minute'));
    if (startDiff > 5) {
      issues.push({
        id: makeId(),
        waybillId: waybill.id,
        severity: startDiff > 15 ? 'error' : 'warning',
        category: 'timestamp_mismatch',
        message: `温度与GPS起始时间偏差 ${startDiff} 分钟`,
        detail: `温度记录起始于 ${tempStart.format('HH:mm')}，GPS起始于 ${gpsStart.format('HH:mm')}，请核实设备时钟是否同步`,
      });
    }

    const endDiff = Math.abs(tempEnd.diff(gpsEnd, 'minute'));
    if (endDiff > 5) {
      issues.push({
        id: makeId(),
        waybillId: waybill.id,
        severity: endDiff > 15 ? 'error' : 'warning',
        category: 'timestamp_mismatch',
        message: `温度与GPS结束时间偏差 ${endDiff} 分钟`,
        detail: `温度记录结束于 ${tempEnd.format('HH:mm')}，GPS结束于 ${gpsEnd.format('HH:mm')}，请核实设备时钟是否同步`,
      });
    }

    const tempDuration = tempEnd.diff(tempStart, 'minute');
    const gpsDuration = gpsEnd.diff(gpsStart, 'minute');
    const durationDiff = Math.abs(tempDuration - gpsDuration);
    if (durationDiff > 15) {
      issues.push({
        id: makeId(),
        waybillId: waybill.id,
        severity: 'warning',
        category: 'timestamp_mismatch',
        message: `温度与GPS记录时长差异 ${durationDiff} 分钟`,
        detail: `温度记录 ${tempDuration} 分钟，GPS记录 ${gpsDuration} 分钟，存在较大差异`,
      });
    }
  }

  loadingEvents.forEach((event, idx) => {
    const eventStart = dayjs(event.startTime);
    const eventEnd = dayjs(event.endTime);

    if (eventStart.isBefore(departureTime.subtract(120, 'minute'))) {
      issues.push({
        id: makeId(),
        waybillId: waybill.id,
        severity: 'warning',
        category: 'loading_out_of_range',
        message: `装卸事件 "${event.location}" 开始时间早于发车前2小时`,
        detail: `装卸开始 ${eventStart.format('MM-DD HH:mm')}，发车时间 ${departureTime.format('MM-DD HH:mm')}，请核实装卸记录是否属于本次运输`,
      });
    }

    if (eventEnd.isAfter(arrivalTime.add(60, 'minute'))) {
      issues.push({
        id: makeId(),
        waybillId: waybill.id,
        severity: 'warning',
        category: 'loading_out_of_range',
        message: `装卸事件 "${event.location}" 结束时间晚于到达后1小时`,
        detail: `装卸结束 ${eventEnd.format('MM-DD HH:mm')}，到达时间 ${arrivalTime.format('MM-DD HH:mm')}，请核实装卸记录是否属于本次运输`,
      });
    }

    if (event.durationMin > 120) {
      issues.push({
        id: makeId(),
        waybillId: waybill.id,
        severity: 'warning',
        category: 'loading_out_of_range',
        message: `装卸事件 "${event.location}" 持续 ${event.durationMin} 分钟，超出合理范围`,
        detail: `装卸/等待时间过长，可能影响货品温度，建议优化装卸流程`,
      });
    }
  });

  if (tempRecords.length === 0) {
    issues.push({
      id: makeId(),
      waybillId: waybill.id,
      severity: 'error',
      category: 'missing_data',
      message: '缺少温度记录数据',
      detail: '未找到温度采集记录，无法进行温漂分析，请补充温度文件',
    });
  }

  if (gpsPoints.length === 0) {
    issues.push({
      id: makeId(),
      waybillId: waybill.id,
      severity: 'error',
      category: 'missing_data',
      message: '缺少GPS轨迹数据',
      detail: '未找到GPS定位记录，无法进行路线回放，请补充GPS文件',
    });
  }

  return issues;
}

export function getSeverityIcon(severity: ValidationSeverity): string {
  return severity === 'error' ? 'error' : 'warning';
}
