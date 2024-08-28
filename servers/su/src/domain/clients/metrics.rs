use super::super::config::AoConfig;
use super::super::core::dal::CoreMetrics;
use prometheus::{HistogramOpts, HistogramVec, IntCounter, Registry};

/*
  Implementation of metrics

  see https://github.com/OpenObservability/OpenMetrics/blob/main/specification/OpenMetrics.md
  for information on different models.
*/

pub struct PromMetrics {
    enabled: bool,
    core_metrics: HistogramVec,
    message_save_failures: IntCounter,
}

impl PromMetrics {
    pub fn new(config: AoConfig, registry: Registry) -> Self {
        // Define the options for the histogram, with buckets in milliseconds
        let histogram_opts = HistogramOpts::new(
            "core_metrics_duration_milliseconds",
            "Histogram of durations for core metrics functions in milliseconds",
        )
        .buckets(vec![
            0.0, 1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0, 5500.0,
            6000.0, 6500.0, 7000.0, 7500.0, 8000.0, 8500.0, 9000.0, 9500.0, 10000.0,
        ])
        .namespace("su");

        // Create a HistogramVec with labels for the different core metric functions
        let core_metrics = HistogramVec::new(histogram_opts, &["function_name"]).unwrap();

        // Register the HistogramVec with the provided registry
        registry.register(Box::new(core_metrics.clone())).unwrap();

        let message_save_failures: IntCounter =
            IntCounter::new("message_save_failures", "message save failure count").unwrap();

        // Register the IntCounter with the provided registry
        registry
            .register(Box::new(message_save_failures.clone()))
            .unwrap();

        PromMetrics {
            enabled: config.enable_metrics,
            core_metrics,
            message_save_failures,
        }
    }

    fn observe_duration(&self, function_name: &str, duration: u128) {
        if !self.enabled {
            return;
        }

        // Observe the duration in milliseconds directly
        self.core_metrics
            .with_label_values(&[function_name])
            .observe(duration as f64);
    }
}

impl CoreMetrics for PromMetrics {
    fn get_process_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.observe_duration("get_process", duration);
    }

    fn get_message_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.observe_duration("get_message", duration);
    }

    fn get_messages_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.observe_duration("get_messages", duration);
    }

    fn read_message_data_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.observe_duration("read_message_data", duration);
    }

    fn write_item_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.observe_duration("write_item", duration);
    }

    fn write_assignment_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.observe_duration("write_assignment", duration);
    }

    fn acquire_write_lock_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.observe_duration("acquire_write_lock", duration);
    }

    fn failed_message_save(&self) {
        self.message_save_failures.inc();
    }
}
