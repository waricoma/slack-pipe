function cron() { Logger.log(UrlFetchApp.fetch(PropertiesService.getScriptProperties().getProperty('URL'))); }
